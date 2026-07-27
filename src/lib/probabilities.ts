import { Odds, PlayerImpact, TeamBajasDetail } from '../types';

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
  const [p1, pX, p2] = removeOverroundPower(odds[1], odds.X, odds[2]);
  
  return {
    1: p1,
    X: pX,
    2: p2,
  };
}

// Calculate player impact score (0 to 1) based on role, position, status, and stats
export function calculatePlayerImpactScore(player: Partial<PlayerImpact>): number {
  const roleWeights = { star: 1.0, starter: 0.7, rotation: 0.35, substitute: 0.15, unknown: 0.5 };
  const posWeights = { GK: 0.9, DEF: 0.75, MID: 0.7, FWD: 0.85 };
  const statusMult = { confirmed_out: 1.0, suspended: 0.8, doubtful: 0.4, recovered: 0.0 };

  const rW = roleWeights[player.role || 'starter'];
  const pW = posWeights[player.position || 'MID'];
  const sM = statusMult[player.status || 'confirmed_out'];

  let baseScore = rW * pW * sM;

  if (player.goals && player.goals > 3) baseScore *= 1.25;
  if (player.minutesPlayed && player.minutesPlayed > 1200) baseScore *= 1.15;

  return Math.min(1.0, Math.max(0.05, baseScore));
}

export function calculateTeamBajasImpact(players: PlayerImpact[]): { penaltyFactor: number; fragilityFlags: string[] } {
  if (!players || players.length === 0) {
    return { penaltyFactor: 0, fragilityFlags: [] };
  }

  let totalImpactScore = 0;
  let defCount = 0;
  let gkInjured = false;
  let starterCount = 0;

  players.forEach(p => {
    const score = p.impactScore || calculatePlayerImpactScore(p);
    totalImpactScore += score;

    if (p.position === 'DEF' && (p.status === 'confirmed_out' || p.status === 'suspended')) defCount++;
    if (p.position === 'GK' && (p.status === 'confirmed_out' || p.status === 'suspended') && (p.role === 'star' || p.role === 'starter')) gkInjured = true;
    if ((p.role === 'star' || p.role === 'starter') && (p.status === 'confirmed_out' || p.status === 'suspended')) starterCount++;
  });

  const fragilityFlags: string[] = [];
  let lineMultiplier = 1.0;

  if (defCount >= 2) {
    fragilityFlags.push('⚠️ Defensa diezmada');
    lineMultiplier *= 1.3;
  }
  if (gkInjured) {
    fragilityFlags.push('⚠️ Sin portero titular');
    lineMultiplier *= 1.4;
  }
  if (starterCount >= 3) {
    fragilityFlags.push('⚠️ Plantilla diezmada');
    lineMultiplier *= 1.5;
  }

  // Base penalty per team
  let penalty = totalImpactScore * 0.04 * lineMultiplier;
  penalty = Math.min(0.15, penalty); // Cap max penalty at 15%

  return {
    penaltyFactor: -penalty,
    fragilityFlags
  };
}

export function fuseProbabilities(
  cuotas: [number, number, number], 
  numBajasLocalOrDetail: number | TeamBajasDetail, 
  numBajasVisitanteOrDetail: number | TeamBajasDetail,
  porcentajesLAE: [number, number, number]
) {
  // 1. Quitar margen comercial (Power Method)
  const probBase = removeOverroundPower(cuotas[0], cuotas[1], cuotas[2]);
  let probReales = [...probBase] as [number, number, number];

  // Calculate penalties based on either detail objects or fallback numeric count
  let penaltyHome = 0;
  let penaltyAway = 0;

  if (typeof numBajasLocalOrDetail === 'object') {
    penaltyHome = Math.abs(numBajasLocalOrDetail.factor_penalizacion || 0);
  } else {
    penaltyHome = numBajasLocalOrDetail * 0.02;
  }

  if (typeof numBajasVisitanteOrDetail === 'object') {
    penaltyAway = Math.abs(numBajasVisitanteOrDetail.factor_penalizacion || 0);
  } else {
    penaltyAway = numBajasVisitanteOrDetail * 0.02;
  }

  probReales[0] = Math.max(0.01, probReales[0] - penaltyHome);
  probReales[2] = Math.max(0.01, probReales[2] - penaltyAway);
  
  // Renormalizar para que sumen 1 (100%)
  const suma = probReales[0] + probReales[1] + probReales[2];
  probReales = [probReales[0]/suma, probReales[1]/suma, probReales[2]/suma];

  return {
    probabilidades: probReales,
    probabilidadesSinBajas: probBase,
    impactoLocal: -penaltyHome,
    impactoVisitante: -penaltyAway,
    ev: [
      probReales[0] / (porcentajesLAE[0] || 1),
      probReales[1] / (porcentajesLAE[1] || 1),
      probReales[2] / (porcentajesLAE[2] || 1)
    ]
  };
}
