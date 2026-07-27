import { Match, TicketSettings, GeneratedTicket, Selection } from '../types';

function getHammingDistance(picksA: Selection[], picksB: Selection[]): number {
  let dist = 0;
  for (let i = 0; i < picksA.length; i++) {
    if (picksA[i] !== picksB[i]) dist++;
  }
  return dist;
}

export function generateCombinations(matches: Match[], settings: TicketSettings): GeneratedTicket[] {
  let results: GeneratedTicket[] = [];
  const MAX_TRIES = 50000;
  let tries = 0;
  
  // Para reducir, primero necesitamos un conjunto base amplio de las selecciones del usuario
  // Si el usuario no ha marcado nada, asumimos triples en todos
  const baseCombinations: Selection[][] = [];
  
  const generateRandomPick = (match: Match): Selection => {
    const choices = match.selections.length > 0 ? match.selections : (['1', 'X', '2'] as Selection[]);
    
    if (settings.algorithm === 'montecarlo' || settings.algorithm === 'ev') {
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

  // Si el algoritmo es reducción, generamos muchas más columnas primero y luego filtramos
  const targetInitialSize = settings.algorithm === 'reduction' ? settings.budget * 5 : settings.budget;

  while (results.length < targetInitialSize && tries < MAX_TRIES) {
    tries++;
    const picks: Selection[] = [];
    let prob = 1;
    let variants = 0;
    let numX = 0;
    let num2 = 0;

    for (const match of matches) {
      const pick = generateRandomPick(match);
      picks.push(pick);
      prob *= match.trueProbabilities[pick];
      
      if (pick === 'X' || pick === '2') variants++;
      if (pick === 'X') numX++;
      if (pick === '2') num2++;
    }

    const hash = picks.join('');
    if (seen.has(hash)) continue;

    if (settings.algorithm === 'filters' || settings.algorithm === 'reduction') {
      if (variants < settings.minVariants || variants > settings.maxVariants) continue;
      if (numX < settings.minX || numX > settings.maxX) continue;
      if (num2 < settings.min2 || num2 > settings.max2) continue;
    }

    seen.add(hash);
    results.push({
      id: hash,
      picks,
      probability: prob,
    });
  }

  if (settings.algorithm === 'ev') {
    results.sort((a, b) => b.probability - a.probability);
  } else if (settings.algorithm === 'reduction') {
    // Reducción Greedy (Asegurar distancias)
    // Ordenamos por probabilidad para priorizar los resultados más probables
    results.sort((a, b) => b.probability - a.probability);
    
    const reduced: GeneratedTicket[] = [];
    for (const ticket of results) {
      if (reduced.length >= settings.budget) break;
      
      // Añadimos el ticket si cubre una nueva zona (es decir, está suficientemente "lejos" de los ya añadidos)
      // Para reducción al 13, buscamos mantener una distancia de Hamming >= 2 entre boletos
      // (así abarcamos más espacio de combinaciones posibles).
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
    
    // Si la reducción estricta no alcanza el presupuesto, completamos con los más probables
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
