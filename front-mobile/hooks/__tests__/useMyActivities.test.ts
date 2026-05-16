import { renderHook, waitFor } from "@testing-library/react-native";
import { useMyActivities } from "../useMyActivities";
import { getMyActivities } from "@/services/userActivitiesService";
import { UserActivity } from "@/types/userActivity";

jest.mock("@/services/userActivitiesService", () => ({
  getMyActivities: jest.fn(),
}));

const mockGetMyActivities = getMyActivities as jest.MockedFunction<
  typeof getMyActivities
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useMyActivities", () => {
  it("fetches activities and exposes them", async () => {
    const activities: UserActivity[] = [
      {
        type: "liked_track",
        date: "2026-04-25T15:10:00Z",
        trackTitle: "Papaoutai",
        artist: "Stromae",
      },
    ];
    mockGetMyActivities.mockResolvedValueOnce(activities);

    const { result } = renderHook(() => useMyActivities(5));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetMyActivities).toHaveBeenCalledWith(5);
    expect(result.current.activities).toEqual(activities);
    expect(result.current.error).toBeNull();
  });

  it("captures error message on failure", async () => {
    mockGetMyActivities.mockRejectedValueOnce(new Error("network"));

    const { result } = renderHook(() => useMyActivities());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("network");
    expect(result.current.activities).toEqual([]);
  });

  it("uses a default limit of 5 when no argument is passed", async () => {
    mockGetMyActivities.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useMyActivities());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetMyActivities).toHaveBeenCalledWith(5);
  });

  it("refresh re-triggers the fetch", async () => {
    mockGetMyActivities.mockResolvedValue([]);
    const { result } = renderHook(() => useMyActivities(3));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetMyActivities).toHaveBeenCalledTimes(1);

    await result.current.refresh();
    expect(mockGetMyActivities).toHaveBeenCalledTimes(2);
  });
});
