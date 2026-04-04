/**
 * Normalizes a string for comparison: lowercase, removes accents,
 * strips special characters. Keeps spaces if keepSpaces is true.
 */
export const normalizeString = (str: string, keepSpaces = false): string => {
  const normalized = str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(keepSpaces ? /[^a-z0-9\s]/g : /[^a-z0-9]/g, "");

  return keepSpaces ? normalized.replace(/\s+/g, " ").trim() : normalized;
};

/**
 * Computes the Levenshtein edit distance between two strings.
 * Memory-optimized: uses two rows instead of the full matrix.
 */
export const levenshteinDistance = (a: string, b: string): number => {
  const lenA = a.length;
  const lenB = b.length;

  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  let previousRow: number[] = new Array(lenA + 1);
  let currentRow: number[] = new Array(lenA + 1);

  for (let j = 0; j <= lenA; j++) {
    previousRow[j] = j;
  }

  for (let i = 1; i <= lenB; i++) {
    currentRow[0] = i;
    const charB = b.charCodeAt(i - 1);

    for (let j = 1; j <= lenA; j++) {
      const cost = a.charCodeAt(j - 1) === charB ? 0 : 1;
      currentRow[j] = Math.min(
        previousRow[j] + 1,
        currentRow[j - 1] + 1,
        previousRow[j - 1] + cost,
      );
    }

    const temp = previousRow;
    previousRow = currentRow;
    currentRow = temp;
  }

  return previousRow[lenA];
};

const DEFAULT_SIMILARITY_THRESHOLD = 0.75;

/**
 * Returns true if input approximately matches target using Levenshtein similarity.
 * Allows exact matches regardless of length. For fuzzy matching, requires input
 * length >= 3 and rejects pairs with very different lengths (ratio < 0.5).
 */
export const fuzzyMatch = (
  input: string,
  target: string,
  threshold = DEFAULT_SIMILARITY_THRESHOLD,
): boolean => {
  const normalizedInput = normalizeString(input, true);
  const normalizedTarget = normalizeString(target, true);

  if (normalizedInput.length === 0 || normalizedTarget.length === 0)
    return false;

  // Exact match always succeeds, regardless of length (handles short titles like "OG")
  if (normalizedInput === normalizedTarget) return true;

  if (normalizedInput.length < 3) return false;

  if (
    normalizedTarget.includes(normalizedInput) ||
    normalizedInput.includes(normalizedTarget)
  ) {
    return true;
  }

  const minLength = Math.min(normalizedInput.length, normalizedTarget.length);
  const maxLength = Math.max(normalizedInput.length, normalizedTarget.length);

  // O(1) length-ratio guard before the expensive Levenshtein computation
  if (minLength / maxLength < 0.5) return false;

  const distance = levenshteinDistance(normalizedInput, normalizedTarget);
  return 1 - distance / maxLength >= threshold;
};
