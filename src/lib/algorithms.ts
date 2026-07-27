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
    return { mean: 0, stdDev: 0, p10: 0, p90: 0, simulations: 0 };
  }

  const returns: number[] = [];

  for (let sim = 0; sim < simulations; sim++) {
    // Generate true match outcomes
    const outcome: Selection[] = matches.map(m => {
      const rand = Math.random();
      if (rand < m.trueProbabilities['1']) return '1';
      if (rand < m.trueProbabilities['1'] + m.trueProbabilities['X']) return 'X';
      return '2';
    });

    // Check hits for each ticket
    let totalHitsInSim = 0;
    tickets.forEach(ticket => {
      let hits = 0;
      for (let i = 0; i < outcome.length; i++) {
        if (ticket.picks[i] === outcome[i]) hits++;
      }
      if (hits >= 10) totalHitsInSim++;
    });

    returns.push(totalHitsInSim);
  }

  returns.sort((a, b) => a - b);
  const sum = returns.reduce((acc, v) => acc + v, 0);
  const mean = sum / simulations;
  const variance = returns.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / simulations;
  const stdDev = Math.sqrt(variance);

  const p10 = returns[Math.floor(simulations * 0.10)];
  const p90 = returns[Math.floor(simulations * 0.90)];

  return { mean, stdDev, p10, p90, simulations };
}
