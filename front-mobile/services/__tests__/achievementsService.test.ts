import { getMyAchievements } from "../achievementsService";
import { get } from "../api";
import { UserAchievement } from "@/types/achievement";

process.env.EXPO_PUBLIC_API_URL = "https://api.rythmix.test";

jest.mock("../api", () => ({
  get: jest.fn(),
}));

const mockGet = get as jest.MockedFunction<typeof get>;

beforeEach(() => {
  jest.clearAllMocks();
});

const baseUserAchievement = (
  override: Partial<UserAchievement> = {},
): UserAchievement => ({
  id: "ua-1",
  userId: "user-1",
  achievementId: 1,
  currentProgress: 1,
  requiredProgress: 1,
  currentTier: 1,
  unlockedAt: "2026-05-10T08:00:00Z",
  achievement: {
    id: 1,
    name: "Première victoire",
    description: "Gagner sa toute première partie multijoueur",
    icon: "🥇",
    type: "FirstWin",
  },
  ...override,
});

describe("achievementsService", () => {
  it("GETs the user achievements endpoint", async () => {
    mockGet.mockResolvedValueOnce({ userAchievements: [] });
    await getMyAchievements();
    expect(mockGet).toHaveBeenCalledWith("/api/user-achievements/me");
  });

  it("flattens the nested achievement relation into a single object", async () => {
    const unlocked = baseUserAchievement();
    const locked = baseUserAchievement({
      id: "ua-2",
      achievementId: 2,
      currentProgress: 3,
      requiredProgress: 10,
      unlockedAt: null,
      achievement: {
        id: 2,
        name: "Vétéran",
        description: "Jouer 10 parties",
        icon: "🏆",
        type: "GamesPlayed",
      },
    });

    mockGet.mockResolvedValueOnce({ userAchievements: [unlocked, locked] });

    const result = await getMyAchievements();

    expect(result).toEqual([
      {
        id: 1,
        name: "Première victoire",
        description: "Gagner sa toute première partie multijoueur",
        icon: "🥇",
        type: "FirstWin",
        currentProgress: 1,
        requiredProgress: 1,
        unlockedAt: "2026-05-10T08:00:00Z",
      },
      {
        id: 2,
        name: "Vétéran",
        description: "Jouer 10 parties",
        icon: "🏆",
        type: "GamesPlayed",
        currentProgress: 3,
        requiredProgress: 10,
        unlockedAt: null,
      },
    ]);
  });

  it("returns an empty array when no achievements are returned", async () => {
    mockGet.mockResolvedValueOnce({ userAchievements: [] });
    expect(await getMyAchievements()).toEqual([]);
  });

  it("propagates API errors", async () => {
    mockGet.mockRejectedValueOnce(new Error("network down"));
    await expect(getMyAchievements()).rejects.toThrow("network down");
  });
});
