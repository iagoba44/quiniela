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
  const [p1, pX, p2] = removeOverroundPower(odds[1], odds.X, odds[2]);
  
  return {
    1: p1,
    X: pX,
    2: p2,
  };
}

export function fuseProbabilities(
  cuotas: [number, number, number], 
  numBajasLocal: number, 
  numBajasVisitante: number,
  porcentajesLAE: [number, number, number]
) {
  // 1. Quitar margen comercial (Power Method)
  let probReales = removeOverroundPower(cuotas[0], cuotas[1], cuotas[2]);

  // 2. Aplicar penalizador por bajas (ej: -2% por cada baja confirmada)
  const PENALIZACION_POR_BAJA = 0.02;
  probReales[0] = Math.max(0, probReales[0] - (numBajasLocal * PENALIZACION_POR_BAJA));
  probReales[2] = Math.max(0, probReales[2] - (numBajasVisitante * PENALIZACION_POR_BAJA));
  
  // Renormalizar para que sumen 1 (100%)
  const suma = probReales[0] + probReales[1] + probReales[2];
  probReales = [probReales[0]/suma, probReales[1]/suma, probReales[2]/suma];

  // 3. Retornar probabilidades junto con el EV para el reductor de boletos
  return {
    probabilidades: probReales,
    ev: [
      probReales[0] / (porcentajesLAE[0] || 1),
      probReales[1] / (porcentajesLAE[1] || 1),
      probReales[2] / (porcentajesLAE[2] || 1)
    ]
  };
}
