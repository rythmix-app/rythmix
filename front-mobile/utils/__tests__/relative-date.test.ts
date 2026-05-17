import { formatRelativeDate } from "../relative-date";

describe("formatRelativeDate", () => {
  const NOW = new Date("2026-05-14T12:00:00.000Z").getTime();

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const offset = (ms: number) => new Date(NOW - ms).toISOString();

  it("returns 'À l'instant' for under one minute", () => {
    expect(formatRelativeDate(offset(30 * 1000))).toBe("À l'instant");
  });

  it("returns minutes for under one hour", () => {
    expect(formatRelativeDate(offset(5 * 60_000))).toBe("Il y a 5 min");
  });

  it("returns hours for under one day", () => {
    expect(formatRelativeDate(offset(3 * 60 * 60_000))).toBe("Il y a 3h");
  });

  it("returns 'Hier' for exactly one day", () => {
    expect(formatRelativeDate(offset(24 * 60 * 60_000))).toBe("Hier");
  });

  it("returns days for between 2 and 6 days", () => {
    expect(formatRelativeDate(offset(3 * 24 * 60 * 60_000))).toBe(
      "Il y a 3 jours",
    );
  });

  it("returns weeks for between 7 and 29 days", () => {
    expect(formatRelativeDate(offset(14 * 24 * 60 * 60_000))).toBe(
      "Il y a 2 sem.",
    );
  });

  it("returns months for between 30 and 364 days", () => {
    expect(formatRelativeDate(offset(90 * 24 * 60 * 60_000))).toBe(
      "Il y a 3 mois",
    );
  });

  it("returns 'Il y a 1 an' for one year", () => {
    expect(formatRelativeDate(offset(365 * 24 * 60 * 60_000))).toBe(
      "Il y a 1 an",
    );
  });

  it("returns years for more than one year", () => {
    expect(formatRelativeDate(offset(3 * 365 * 24 * 60 * 60_000))).toBe(
      "Il y a 3 ans",
    );
  });

  it("clamps future dates to 'À l'instant'", () => {
    const future = new Date(NOW + 10 * 60_000).toISOString();
    expect(formatRelativeDate(future)).toBe("À l'instant");
  });
});
