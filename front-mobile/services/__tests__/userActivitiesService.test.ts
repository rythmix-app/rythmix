import { getMyActivities } from "../userActivitiesService";
import { get } from "../api";
import { UserActivity } from "@/types/userActivity";

jest.mock("../api", () => ({
  get: jest.fn(),
}));

const mockGet = get as jest.MockedFunction<typeof get>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("userActivitiesService", () => {
  it("getMyActivities GETs without query when limit is omitted", async () => {
    mockGet.mockResolvedValueOnce({ activities: [] });
    const result = await getMyActivities();
    expect(mockGet).toHaveBeenCalledWith("/api/me/activities");
    expect(result).toEqual([]);
  });

  it("getMyActivities forwards the limit query param", async () => {
    mockGet.mockResolvedValueOnce({ activities: [] });
    await getMyActivities(10);
    expect(mockGet).toHaveBeenCalledWith("/api/me/activities?limit=10");
  });

  it("getMyActivities returns the activities array from the response", async () => {
    const activities: UserActivity[] = [
      {
        type: "game_session",
        date: "2026-04-25T18:42:00Z",
        gameTitle: "Blurchette",
        score: 8,
        maxScore: 10,
      },
      {
        type: "liked_track",
        date: "2026-04-25T15:10:00Z",
        trackTitle: "Papaoutai",
        artist: "Stromae",
      },
    ];
    mockGet.mockResolvedValueOnce({ activities });
    const result = await getMyActivities(5);
    expect(result).toEqual(activities);
  });
});
