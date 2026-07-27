import { Odds } from '../types';

// Descontar el overround (Power Method)
export function removeOverroundPower(c1: number, cX: number, c2: number): [number, number, number] {
  const pRaw = [1 / c1, 1 / cX, 1 / c2];
  let k = 1.0;
  for (let i = 0; i < 20; i++) {
    const sum = Math.pow(pRaw[0], k) + Math.pow(pRaw[1], k) + Math.pow(pRaw[2], k);
    if (Math.abs(sum - 1) < 0.0001) break;
    k = k * (1 + Math.log(1 / sum) / 3);
  }
  return [Math.pow(pRaw[0], k), Math.pow(pRaw[1], k), Math.pow(pRaw[2], k)];
}

export function calculateTrueProbabilities(odds: Odds): Odds {
  // Eliminación del overround (margen comercial) mediante Power Method
  const [p1, pX, p2] = removeOverroundPower(odds[1], odds.X, odds[2]);
  
  return {
    1: p1,
    X: pX,
    2: p2,
  };
}

// Evaluar Esperanza Matemática (EV)
export function calculateEV(probModelo: number, probLAE: number): number {
  if (probLAE <= 0) return 0;
  return probModelo / probLAE;
}

export function fuseProbabilities(
  oddsProbs: Odds,
  statsProbs?: Odds,
  bajasHome: { confirmadas: string[], sancionados: string[] } = { confirmadas: [], sancionados: [] },
  bajasAway: { confirmadas: string[], sancionados: string[] } = { confirmadas: [], sancionados: [] }
): Odds {
  // Por defecto, si no hay stats, usamos las cuotas como base al 100%
  // Si hay stats, hacemos 50% cuotas, 30% stats (el otro 20% es penalizaciones)
  let final1 = oddsProbs[1];
  let finalX = oddsProbs.X;
  let final2 = oddsProbs[2];

  if (statsProbs) {
    final1 = (oddsProbs[1] * 0.625) + (statsProbs[1] * 0.375);
    finalX = (oddsProbs.X * 0.625) + (statsProbs.X * 0.375);
    final2 = (oddsProbs[2] * 0.625) + (statsProbs[2] * 0.375);
  }

  // Modificar la función fuseProbabilities matemática para que sume la longitud de los arrays bajas_confirmadas y sancionados.
  // Aplicar una regla matemática directa: cada baja confirmada resta un 1.5% a la probabilidad base del equipo, con un tope máximo del -8%.
  const totalOutHome = bajasHome.confirmadas.length + bajasHome.sancionados.length;
  const homePenalty = Math.min(0.08, totalOutHome * 0.015);

  const totalOutAway = bajasAway.confirmadas.length + bajasAway.sancionados.length;
  const awayPenalty = Math.min(0.08, totalOutAway * 0.015);

  // Aplicar penalizaciones
  if (homePenalty > 0) {
    final1 -= homePenalty;
    finalX += homePenalty / 2;
    final2 += homePenalty / 2;
  }
  
  if (awayPenalty > 0) {
    final2 -= awayPenalty;
    finalX += awayPenalty / 2;
    final1 += awayPenalty / 2;
  }

  // Normalizar para que sumen 1 siempre
  const total = final1 + finalX + final2;
  return {
    1: Math.max(0.01, final1 / total),
    X: Math.max(0.01, finalX / total),
    2: Math.max(0.01, final2 / total)
  };
}
