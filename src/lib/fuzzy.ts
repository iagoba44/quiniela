import { compareTwoStrings } from 'string-similarity';

const ALIAS_MAP: Record<string, string> = {
  "Athletic Club": "Athletic Bilbao",
  "CA Osasuna": "Osasuna",
  "Atlético de Madrid": "Atletico Madrid",
  "RCD Espanyol": "Espanyol",
  "Real Madrid CF": "Real Madrid"
};

export function normalizarNombre(nombre: string): string {
  return ALIAS_MAP[nombre] || nombre;
}

export function findBestMatch(target: string, candidates: string[]): string | null {
  if (!candidates || candidates.length === 0) return null;
  
  const normalizedTarget = normalizarNombre(target);

  let bestMatch = '';
  let bestScore = 0;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizarNombre(candidate);
    // string-similarity returns a score between 0 and 1
    const score = compareTwoStrings(normalizedTarget.toLowerCase(), normalizedCandidate.toLowerCase());
    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  // Threshold of 0.4 ensures we have at least a decent match
  return bestScore > 0.4 ? bestMatch : null;
}
