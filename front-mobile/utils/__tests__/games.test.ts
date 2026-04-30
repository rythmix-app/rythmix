import { getGameImage } from "../games";

describe("getGameImage", () => {
  it("returns an image for each solo game (canonical name)", () => {
    expect(getGameImage("Blind Test")).not.toBeNull();
    expect(getGameImage("Blurchette")).not.toBeNull();
    expect(getGameImage("Tracklist")).not.toBeNull();
    expect(getGameImage("Plus ou Moins")).not.toBeNull();
    expect(getGameImage("Parkeur")).not.toBeNull();
  });

  it("normalizes input (lowercase + trim)", () => {
    expect(getGameImage("  BLURCHETTE  ")).not.toBeNull();
    expect(getGameImage("TRACKLIST")).not.toBeNull();
    expect(getGameImage("plus ou moins")).not.toBeNull();
  });

  it("supports aliases for the same game", () => {
    expect(getGameImage("blindtest")).toBe(getGameImage("blind test"));
    expect(getGameImage("higher or lower")).toBe(getGameImage("plus ou moins"));
  });

  it("returns null for unmapped multiplayer games", () => {
    expect(getGameImage("Qui dit ça ?")).toBeNull();
    expect(getGameImage("Fausse Punch")).toBeNull();
    expect(getGameImage("Qui l'a mise ?")).toBeNull();
  });

  it("returns null for unknown games", () => {
    expect(getGameImage("unknown")).toBeNull();
    expect(getGameImage("")).toBeNull();
  });
});
