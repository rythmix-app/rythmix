import { userStatsService } from "../userStatsService";
import { get } from "../api";

jest.mock("../api", () => ({
  get: jest.fn(),
}));

const mockGet = get as jest.MockedFunction<typeof get>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("userStatsService", () => {
  it("getMyStats GETs /api/me/stats and returns the data field", async () => {
    mockGet.mockResolvedValueOnce({
      data: { totalSwipes: 12, gamesPlayed: 3, streak: 2 },
    });

    const result = await userStatsService.getMyStats();

    expect(mockGet).toHaveBeenCalledWith("/api/me/stats");
    expect(result).toEqual({ totalSwipes: 12, gamesPlayed: 3, streak: 2 });
  });

  it("propagates errors from the api layer", async () => {
    mockGet.mockRejectedValueOnce(new Error("network down"));

    await expect(userStatsService.getMyStats()).rejects.toThrow("network down");
  });
});
