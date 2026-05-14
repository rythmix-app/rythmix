import { answerHintTokens, compareAnswers, normalizeAnswer } from "../parkeur";

describe("parkeur utils", () => {
  describe("normalizeAnswer", () => {
    it("strips accents, casing and punctuation", () => {
      expect(normalizeAnswer("Téléphone, allô !")).toBe("telephone allo");
    });

    it("collapses repeated whitespace", () => {
      expect(normalizeAnswer("  hello   world  ")).toBe("hello world");
    });

    it("returns empty string for whitespace only", () => {
      expect(normalizeAnswer("   ")).toBe("");
    });
  });

  describe("compareAnswers", () => {
    it("matches identical strings", () => {
      expect(compareAnswers("hello world", "hello world")).toBe(true);
    });

    it("ignores case differences", () => {
      expect(compareAnswers("HELLO World", "hello world")).toBe(true);
    });

    it("ignores accents", () => {
      expect(compareAnswers("telephone", "Téléphone")).toBe(true);
    });

    it("ignores punctuation", () => {
      expect(compareAnswers("comment vas tu", "Comment vas-tu ?")).toBe(true);
    });

    it("ignores leading and trailing whitespace", () => {
      expect(compareAnswers("  bonjour ", "bonjour")).toBe(true);
    });

    it("returns false on different content", () => {
      expect(compareAnswers("hello", "world")).toBe(false);
    });

    it("returns false when expected is empty", () => {
      expect(compareAnswers("hello", "   ")).toBe(false);
    });

    it("returns false when input is empty", () => {
      expect(compareAnswers("", "hello")).toBe(false);
    });

    it("treats typographic quotes like apostrophes", () => {
      expect(
        compareAnswers("j’pense qu’à mailler", "j'pense qu'à mailler"),
      ).toBe(true);
      expect(
        compareAnswers("j ‘pense qu ’a mailler", "j'pense qu'à mailler"),
      ).toBe(true);
    });

    it("tolerates small typos via Levenshtein distance", () => {
      // 1-letter typo on a long sentence should match
      expect(
        compareAnswers(
          "trop souvent dans mes oreille on m'a dit laisse tomber",
          "Trop souvent dans mes oreilles, on m'a dit laisse tomber",
        ),
      ).toBe(true);
    });

    it("tolerates trailing filler words like (yeah)", () => {
      expect(
        compareAnswers(
          "commis tant de delits grace au baveux on s'ra gracies",
          "Commis tant de délits, grâce au baveux, on s'ra graciés (yeah)",
        ),
      ).toBe(true);
    });

    it("strips long trailing parenthetical fillers", () => {
      // Real DB case: user typed correctly but the "(gang, gang, gang)" trailer
      // inflated the Levenshtein threshold and the answer was rejected.
      expect(
        compareAnswers(
          "sur du triple chaine gang",
          "Sur du triple chain gang (gang, gang, gang)",
        ),
      ).toBe(true);
      expect(
        compareAnswers(
          "en vrai meme un marron ici qui tle donne sans arriere pensee",
          "En vrai, même un marron, ici qui t'le donne sans arrière pensée (regarde-moi bien)",
        ),
      ).toBe(true);
    });

    it("strips inline parenthetical content too", () => {
      expect(
        compareAnswers(
          "et je ne vois que mon putain dreflet dans la codeine",
          "Et je ne vois que mon putain d'reflet (oh) dans la codéine",
        ),
      ).toBe(true);
    });

    it("rejects answers that exceed the typo budget", () => {
      expect(
        compareAnswers(
          "completely different sentence here",
          "Trop souvent dans mes oreilles, on m'a dit laisse tomber",
        ),
      ).toBe(false);
    });
  });

  describe("answerHintTokens", () => {
    it("masks letters/digits while keeping punctuation visible", () => {
      expect(answerHintTokens("J'aime le rap, vraiment !")).toEqual([
        "_'____",
        "__",
        "___,",
        "________",
        "!",
      ]);
    });

    it("preserves accents-tracking underscores per visible char", () => {
      expect(answerHintTokens("Allô, comment ?")).toEqual([
        "____,",
        "_______",
        "?",
      ]);
    });

    it("returns an empty array for empty input", () => {
      expect(answerHintTokens("")).toEqual([]);
    });
  });
});
