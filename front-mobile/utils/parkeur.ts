import { levenshteinDistance } from "@/utils/stringUtils";

/**
 * Normalises an answer string for Parkeur: strips parenthetical fillers like
 * "(yeah)" or "(gang, gang, gang)", lowercases, removes accents and punctuation
 * (incl. typographic quotes), and collapses whitespace.
 */
export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.,!?;:'"`\-()…«»“”‘’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tolerant comparison. Accepts a normalised match OR a Levenshtein distance
 * within ~20% of the expected length (capped at min 2 to allow short answers
 * to absorb a couple of typos / missing trailing words like "(yeah)").
 */
export function compareAnswers(input: string, expected: string): boolean {
  const a = normalizeAnswer(input);
  const b = normalizeAnswer(expected);
  if (!b) return false;
  if (a === b) return true;
  const threshold = Math.max(2, Math.floor(b.length * 0.2));
  return levenshteinDistance(a, b) <= threshold;
}

/**
 * Builds the underscore hint shown to the player: each letter/digit is replaced
 * with `_`, while spaces, apostrophes and punctuation stay visible — like
 * "N'oubliez pas les paroles" on TV. Returns one token per whitespace-separated
 * group so the UI can render them on a wrapping row.
 */
export function answerHintTokens(expected: string): string[] {
  if (!expected) return [];
  return expected
    .normalize("NFC")
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[\p{L}\p{N}]/gu, "_"))
    .filter((token) => token.length > 0);
}
