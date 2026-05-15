import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useMyAchievements } from "../useMyAchievements";
import { getMyAchievements } from "@/services/achievementsService";
import { UserAchievementWithDetails } from "@/types/achievement";

jest.mock("@/services/achievementsService", () => ({
  getMyAchievements: jest.fn(),
}));

jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(() => {
      const cleanup = callback();
      return typeof cleanup === "function" ? cleanup : undefined;
    }, [callback]);
  },
}));

const mockGetMyAchievements = getMyAchievements as jest.MockedFunction<
  typeof getMyAchievements
>;

const buildAchievement = (
  override: Partial<UserAchievementWithDetails> = {},
): UserAchievementWithDetails => ({
  id: 1,
  name: "Première victoire",
  description: "Gagner sa toute première partie",
  icon: "🥇",
  type: "FirstWin",
  currentProgress: 1,
  requiredProgress: 1,
  unlockedAt: "2026-05-10T08:00:00Z",
  ...override,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useMyAchievements", () => {
  it("fetches achievements on mount and exposes them", async () => {
    const data = [buildAchievement()];
    mockGetMyAchievements.mockResolvedValueOnce(data);

    const { result } = renderHook(() => useMyAchievements());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetMyAchievements).toHaveBeenCalledTimes(1);
    expect(result.current.achievements).toEqual(data);
    expect(result.current.error).toBeNull();
  });

  it("captures error message on failure", async () => {
    mockGetMyAchievements.mockRejectedValueOnce(new Error("network down"));

    const { result } = renderHook(() => useMyAchievements());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("network down");
    expect(result.current.achievements).toEqual([]);
  });

  it("falls back to 'Unknown error' when thrown value is not an Error", async () => {
    mockGetMyAchievements.mockRejectedValueOnce("plain string");

    const { result } = renderHook(() => useMyAchievements());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Unknown error");
  });

  it("refresh re-triggers the fetch", async () => {
    mockGetMyAchievements.mockResolvedValue([]);

    const { result } = renderHook(() => useMyAchievements());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetMyAchievements).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh();
    });
    expect(mockGetMyAchievements).toHaveBeenCalledTimes(2);
  });
});
