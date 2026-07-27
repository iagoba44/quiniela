import { compareTwoStrings } from 'string-similarity';

export function findBestMatch(target: string, candidates: string[]): string | null {
  if (!candidates || candidates.length === 0) return null;
  
  let bestMatch = '';
  let bestScore = 0;

  for (const candidate of candidates) {
    // string-similarity returns a score between 0 and 1
    const score = compareTwoStrings(target.toLowerCase(), candidate.toLowerCase());
    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  // Threshold of 0.4 ensures we have at least a decent match
  return bestScore > 0.4 ? bestMatch : null;
}
