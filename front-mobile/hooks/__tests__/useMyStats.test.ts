import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useMyStats } from "../useMyStats";
import { userStatsService } from "@/services/userStatsService";

jest.mock("@/services/userStatsService", () => ({
  userStatsService: {
    getMyStats: jest.fn(),
  },
}));

describe("useMyStats", () => {
  const mockStats = {
    totalSwipes: 100,
    gamesPlayed: 10,
    streak: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch stats on mount", async () => {
    (userStatsService.getMyStats as jest.Mock).mockResolvedValue(mockStats);

    const { result } = renderHook(() => useMyStats());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.error).toBeNull();
    expect(userStatsService.getMyStats).toHaveBeenCalledTimes(1);
  });

  it("should handle error during fetch", async () => {
    (userStatsService.getMyStats as jest.Mock).mockRejectedValue(
      new Error("Network error"),
    );

    const { result } = renderHook(() => useMyStats());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBe(
      "Erreur lors du chargement des statistiques",
    );
  });

  it("should retry fetching stats", async () => {
    (userStatsService.getMyStats as jest.Mock)
      .mockRejectedValueOnce(new Error("First fail"))
      .mockResolvedValueOnce(mockStats);

    const { result } = renderHook(() => useMyStats());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).not.toBeNull();

    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.error).toBeNull();
    expect(userStatsService.getMyStats).toHaveBeenCalledTimes(2);
  });
});
