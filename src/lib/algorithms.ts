import { Match, TicketSettings, GeneratedTicket, Selection, MonteCarloStats } from '../types';

function getHammingDistance(picksA: Selection[], picksB: Selection[]): number {
  let dist = 0;
  for (let i = 0; i < picksA.length; i++) {
    if (picksA[i] !== picksB[i]) dist++;
  }
  return dist;
}

export function generateCombinations(matches: Match[], settings: TicketSettings): GeneratedTicket[] {
  let results: GeneratedTicket[] = [];
  const MAX_TRIES = 60000;
  let tries = 0;
  
  const jackpotMultiplier = settings.jackpotAmount && settings.jackpotAmount > 0 
    ? 1 + Math.min(0.5, settings.jackpotAmount / 5000000) 
    : 1;

  // Modo Quiniela Clásica (Dobles y Triples Directos)
  if (settings.algorithm === 'classic' || (settings.classicDobles && settings.classicDobles > 0) || (settings.classicTriples && settings.classicTriples > 0)) {
    const doblesCount = settings.classicDobles || 0;
    const triplesCount = settings.classicTriples || 0;

    const matchUncertainties = matches.map((m, idx) => {
      const maxP = Math.max(m.trueProbabilities['1'], m.trueProbabilities['X'], m.trueProbabilities['2']);
      return { idx, match: m, uncertainty: 1 - maxP };
    });
    matchUncertainties.sort((a, b) => b.uncertainty - a.uncertainty);

    const tripleSet = new Set<number>();
    const doubleSet = new Set<number>();

    matches.forEach((m, idx) => {
      if (m.selections.length === 3) tripleSet.add(idx);
      else if (m.selections.length === 2) doubleSet.add(idx);
    });

    for (const item of matchUncertainties) {
      if (tripleSet.size >= triplesCount) break;
      if (!tripleSet.has(item.idx) && !doubleSet.has(item.idx)) {
        tripleSet.add(item.idx);
      }
    }

    for (const item of matchUncertainties) {
      if (doubleSet.size >= doblesCount) break;
      if (!tripleSet.has(item.idx) && !doubleSet.has(item.idx)) {
        doubleSet.add(item.idx);
      }
    }

    const allowedChoicesPerMatch: Selection[][] = matches.map((m, idx) => {
      if (tripleSet.has(idx)) {
        return ['1', 'X', '2'];
      }
      if (doubleSet.has(idx)) {
        if (m.selections.length === 2) return m.selections;
        const sorted = (['1', 'X', '2'] as Selection[]).sort((a, b) => m.trueProbabilities[b] - m.trueProbabilities[a]);
        return [sorted[0], sorted[1]];
      }
      if (m.selections.length === 1) return [m.selections[0]];
      const sorted = (['1', 'X', '2'] as Selection[]).sort((a, b) => m.trueProbabilities[b] - m.trueProbabilities[a]);
      return [sorted[0]];
    });

    function cartesianProduct(arrays: Selection[][]): Selection[][] {
      return arrays.reduce<Selection[][]>(
        (acc, curr) => acc.flatMap(d => curr.map(e => [...d, e])),
        [[]]
      );
    }

    const combinations = cartesianProduct(allowedChoicesPerMatch);
    
    return combinations.map(picks => {
      let prob = 1;
      picks.forEach((pick, i) => {
        prob *= matches[i].trueProbabilities[pick];
      });
      const hash = picks.join('');
      return {
        id: hash,
        picks,
        probability: prob,
        evScore: prob * jackpotMultiplier
      };
    }).slice(0, settings.budget || combinations.length);
  }

  const generateRandomPick = (match: Match): Selection => {
    const choices = match.selections.length > 0 ? match.selections : (['1', 'X', '2'] as Selection[]);
    
    if (settings.algorithm === 'montecarlo' || settings.algorithm === 'ev' || settings.algorithm === 'condorcet') {
      const totalProb = choices.reduce((sum, pick) => sum + match.trueProbabilities[pick], 0);
      let rand = Math.random() * totalProb;
      for (const pick of choices) {
        rand -= match.trueProbabilities[pick];
        if (rand <= 0) return pick;
      }
    }
    return choices[Math.floor(Math.random() * choices.length)];
  };

  const seen = new Set<string>();
  const targetInitialSize = (settings.algorithm === 'reduction' || settings.algorithm === 'condorcet') 
    ? settings.budget * 5 
    : settings.budget;

  while (results.length < targetInitialSize && tries < MAX_TRIES) {
    tries++;
    const picks: Selection[] = [];
    let prob = 1;
    let variants = 0;
    let numX = 0;
    let num2 = 0;
    let num1 = 0;

    for (const match of matches) {
      const pick = generateRandomPick(match);
      picks.push(pick);
      prob *= match.trueProbabilities[pick];
      
      if (pick === '1') num1++;
      if (pick === 'X' || pick === '2') variants++;
      if (pick === 'X') numX++;
      if (pick === '2') num2++;
    }

    const hash = picks.join('');
    if (seen.has(hash)) continue;

    // Filter anti-favoritism (too many 1s)
    if (settings.maxHomeOnes && num1 > settings.maxHomeOnes) continue;

    if (settings.algorithm === 'filters' || settings.algorithm === 'reduction') {
      if (variants < settings.minVariants || variants > settings.maxVariants) continue;
      if (numX < settings.minX || numX > settings.maxX) continue;
      if (num2 < settings.min2 || num2 > settings.max2) continue;
    }

    seen.add(hash);
    
    // Apply jackpot bonus for higher payout potential
    const evScore = prob * jackpotMultiplier;

    results.push({
      id: hash,
      picks,
      probability: prob,
      evScore
    });
  }

  if (settings.algorithm === 'ev') {
    results.sort((a, b) => (b.evScore || b.probability) - (a.evScore || a.probability));
  } else if (settings.algorithm === 'condorcet') {
    // Condorcet / Cobertura Condicionada: Identify pivot matches with highest entropy/uncertainty
    const uncertaintyScores = matches.map((m, idx) => {
      const probs = [m.trueProbabilities['1'], m.trueProbabilities['X'], m.trueProbabilities['2']];
      // Entropy score: closest to equal (0.33, 0.33, 0.33)
      const maxP = Math.max(...probs);
      return { idx, uncertainty: 1 - maxP };
    });
    uncertaintyScores.sort((a, b) => b.uncertainty - a.uncertainty);
    const pivotIndices = new Set(uncertaintyScores.slice(0, 5).map(u => u.idx));

    // Sort combinations by coverage on pivot matches
    results.sort((a, b) => {
      let scoreA = a.probability;
      let scoreB = b.probability;
      pivotIndices.forEach(idx => {
        if (a.picks[idx] !== '1') scoreA *= 1.2;
        if (b.picks[idx] !== '1') scoreB *= 1.2;
      });
      return scoreB - scoreA;
    });
  } else if (settings.algorithm === 'reduction') {
    results.sort((a, b) => b.probability - a.probability);
    
    const reduced: GeneratedTicket[] = [];
    for (const ticket of results) {
      if (reduced.length >= settings.budget) break;
      
      let isCovered = false;
      for (const red of reduced) {
        if (getHammingDistance(ticket.picks, red.picks) < 2) {
          isCovered = true;
          break;
        }
      }
      
      if (!isCovered) {
        reduced.push(ticket);
      }
    }
    
    if (reduced.length < settings.budget) {
       for (const ticket of results) {
         if (reduced.length >= settings.budget) break;
         if (!reduced.find(r => r.id === ticket.id)) {
           reduced.push(ticket);
         }
       }
    }
    
    results = reduced;
  }

  return results.slice(0, settings.budget);
}

export function runMonteCarloSimulation(tickets: GeneratedTicket[], matches: Match[], simulations = 1000): MonteCarloStats {
  if (tickets.length === 0 || matches.length === 0) {
    return { 
      mean: 0, 
      stdDev: 0, 
      p10: 0, 
      p90: 0, 
      simulations: 0,
      avgTicketProb: 0,
      totalSetProb10Plus: 0,
      guaranteedHits90: 0,
      categoryWinProbabilities: { 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 },
      expectedCategoryHits: { 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 },
      coverageBreakdown: { fijos: 0, dobles: 0, triples: 0 }
    };
  }

  // Calculate average ticket probability
  const sumProbs = tickets.reduce((acc, t) => acc + (t.probability || 0), 0);
  const avgTicketProb = sumProbs / tickets.length;

  // Calculate coverage breakdown across matches
  let fijos = 0;
  let dobles = 0;
  let triples = 0;

  for (let i = 0; i < matches.length; i++) {
    const picksForMatch = new Set(tickets.map(t => t.picks[i]).filter(Boolean));
    if (picksForMatch.size === 1) fijos++;
    else if (picksForMatch.size === 2) dobles++;
    else if (picksForMatch.size >= 3) triples++;
  }

  const returns: number[] = [];
  const maxHitsPerSim: number[] = [];
  const categoryHitsTotal: Record<number, number> = { 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };
  const categorySimsAchieved: Record<number, number> = { 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };

  for (let sim = 0; sim < simulations; sim++) {
    // Generate true match outcomes based on trueProbabilities
    const outcome: Selection[] = matches.map(m => {
      const rand = Math.random();
      if (rand < m.trueProbabilities['1']) return '1';
      if (rand < m.trueProbabilities['1'] + m.trueProbabilities['X']) return 'X';
      return '2';
    });

    let totalWinningTicketsInSim = 0;
    let maxHitsInSim = 0;
    const simCategoryCounts: Record<number, number> = { 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };

    tickets.forEach(ticket => {
      let hits = 0;
      for (let i = 0; i < outcome.length; i++) {
        if (ticket.picks[i] === outcome[i]) hits++;
      }
      if (hits > maxHitsInSim) maxHitsInSim = hits;
      if (hits >= 10) {
        totalWinningTicketsInSim++;
        if (hits in simCategoryCounts) {
          simCategoryCounts[hits]++;
        }
      }
    });

    returns.push(totalWinningTicketsInSim);
    maxHitsPerSim.push(maxHitsInSim);

    // Track total category hits and win flag
    for (const cat of [10, 11, 12, 13, 14, 15]) {
      categoryHitsTotal[cat] += simCategoryCounts[cat] || 0;
      if (maxHitsInSim >= cat) {
        categorySimsAchieved[cat]++;
      }
    }
  }

  returns.sort((a, b) => a - b);
  maxHitsPerSim.sort((a, b) => a - b);

  const sum = returns.reduce((acc, v) => acc + v, 0);
  const mean = sum / simulations;
  const variance = returns.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / simulations;
  const stdDev = Math.sqrt(variance);

  const p10 = returns[Math.floor(simulations * 0.10)];
  const p90 = returns[Math.floor(simulations * 0.90)];

  // Guaranteed hits at 90% confidence floor (10th percentile of maxHitsPerSim)
  const guaranteedHits90 = maxHitsPerSim[Math.floor(simulations * 0.10)];

  const categoryWinProbabilities: Record<number, number> = {};
  const expectedCategoryHits: Record<number, number> = {};

  for (const cat of [10, 11, 12, 13, 14, 15]) {
    categoryWinProbabilities[cat] = (categorySimsAchieved[cat] / simulations) * 100;
    expectedCategoryHits[cat] = categoryHitsTotal[cat] / simulations;
  }

  return { 
    mean, 
    stdDev, 
    p10, 
    p90, 
    simulations,
    avgTicketProb,
    totalSetProb10Plus: categoryWinProbabilities[10] || 0,
    guaranteedHits90,
    categoryWinProbabilities,
    expectedCategoryHits,
    coverageBreakdown: { fijos, dobles, triples }
  };
}
