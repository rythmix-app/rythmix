import {
  normalizeString,
  levenshteinDistance,
  fuzzyMatch,
} from "../stringUtils";

describe("normalizeString", () => {
  it("lowercases and removes accents", () => {
    expect(normalizeString("Héros")).toBe("heros");
    expect(normalizeString("Élodie")).toBe("elodie");
  });

  it("strips spaces and special characters by default (keepSpaces=false)", () => {
    expect(normalizeString("Hello World!")).toBe("helloworld");
    expect(normalizeString("AC/DC")).toBe("acdc");
    expect(normalizeString("Ça va ?")).toBe("cava");
  });

  it("keeps spaces when keepSpaces=true", () => {
    expect(normalizeString("Hello World!", true)).toBe("hello world");
    expect(normalizeString("  multiple   spaces  ", true)).toBe(
      "multiple spaces",
    );
  });

  it("normalizes accents with keepSpaces=true", () => {
    expect(normalizeString("Élodie et André", true)).toBe("elodie et andre");
    expect(normalizeString("Ça va ?", true)).toBe("ca va");
  });

  it("handles empty string", () => {
    expect(normalizeString("")).toBe("");
    expect(normalizeString("", true)).toBe("");
  });
});

describe("levenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("hello", "hello")).toBe(0);
  });

  it("returns length of other string when one is empty", () => {
    expect(levenshteinDistance("", "abc")).toBe(3);
    expect(levenshteinDistance("abc", "")).toBe(3);
  });

  it("computes correct distance for substitution", () => {
    expect(levenshteinDistance("cat", "bat")).toBe(1);
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
  });

  it("handles insertion and deletion", () => {
    expect(levenshteinDistance("abc", "ac")).toBe(1);
    expect(levenshteinDistance("ac", "abc")).toBe(1);
  });
});

describe("fuzzyMatch", () => {
  it("returns false for empty input", () => {
    expect(fuzzyMatch("", "anything")).toBe(false);
  });

  it("returns false for empty target (avoids String.includes('') false positive)", () => {
    expect(fuzzyMatch("anything", "")).toBe(false);
  });

  it("returns false for input shorter than 3 chars with no exact match", () => {
    expect(fuzzyMatch("ab", "abcdef")).toBe(false);
  });

  it("matches short titles exactly (e.g. 'OG')", () => {
    expect(fuzzyMatch("OG", "OG")).toBe(true);
    expect(fuzzyMatch("og", "OG")).toBe(true);
  });

  it("matches substring when length ratio is sufficient", () => {
    expect(fuzzyMatch("thriller", "Thriller")).toBe(true);
    expect(fuzzyMatch("tiakol", "Tiakola")).toBe(true);
  });

  it("rejects substring when input is too short relative to target", () => {
    expect(fuzzyMatch("tia", "Tiakola")).toBe(false);
    expect(fuzzyMatch("bad", "Michael Jackson - Bad")).toBe(false);
  });

  it("matches with minor typo via Levenshtein", () => {
    expect(fuzzyMatch("bilerstein", "bilderstein")).toBe(true);
  });

  it("returns false when strings are too different in length", () => {
    expect(fuzzyMatch("xyz", "abcdefghijklmnop")).toBe(false);
  });

  it("matches when input is long and target is a short substring of it", () => {
    // input.includes(target) → true (length ratio guard doesn't block this)
    expect(fuzzyMatch("abcdef", "ab")).toBe(true);
  });

  it("returns false for completely different strings of similar length", () => {
    expect(fuzzyMatch("hello", "world")).toBe(false);
  });

  it("accepts a custom threshold", () => {
    // levenshteinDistance("helo","hello")=1, maxLength=5, similarity=1-1/5=0.8
    // passes threshold 0.5, fails threshold 0.99
    expect(fuzzyMatch("helo", "hello", 0.5)).toBe(true);
    expect(fuzzyMatch("helo", "hello", 0.99)).toBe(false);
  });

  it("normalizes accents before matching", () => {
    expect(fuzzyMatch("elodie", "Élodie")).toBe(true);
  });
});
