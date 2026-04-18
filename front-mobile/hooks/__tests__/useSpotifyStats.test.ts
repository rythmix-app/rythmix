import { renderHook, waitFor } from "@testing-library/react-native";
import { useSpotifyStats } from "../useSpotifyStats";
import {
  getRecentlyPlayed,
  getTopArtists,
  getTopTracks,
} from "@/services/spotifyService";

jest.mock("@/services/spotifyService", () => ({
  getTopTracks: jest.fn(),
  getTopArtists: jest.fn(),
  getRecentlyPlayed: jest.fn(),
}));

const mockGetTopTracks = getTopTracks as jest.MockedFunction<
  typeof getTopTracks
>;
const mockGetTopArtists = getTopArtists as jest.MockedFunction<
  typeof getTopArtists
>;
const mockGetRecentlyPlayed = getRecentlyPlayed as jest.MockedFunction<
  typeof getRecentlyPlayed
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useSpotifyStats", () => {
  it("fetches top tracks when type=topTracks", async () => {
    mockGetTopTracks.mockResolvedValueOnce({
      items: [
        {
          id: "t1",
          name: "Track",
          duration_ms: 1,
          artists: [{ id: "a1", name: "Artist" }],
        },
      ],
    });

    const { result } = renderHook(() =>
      useSpotifyStats({ type: "topTracks", timeRange: "short_term", limit: 5 }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetTopTracks).toHaveBeenCalledWith({
      timeRange: "short_term",
      limit: 5,
    });
    expect(result.current.tracks).toHaveLength(1);
  });

  it("fetches top artists when type=topArtists", async () => {
    mockGetTopArtists.mockResolvedValueOnce({
      items: [{ id: "a1", name: "Artist" }],
    });
    const { result } = renderHook(() =>
      useSpotifyStats({ type: "topArtists" }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetTopArtists).toHaveBeenCalledWith({
      timeRange: "medium_term",
      limit: 20,
    });
    expect(result.current.artists).toHaveLength(1);
  });

  it("fetches recently played when type=recentlyPlayed", async () => {
    mockGetRecentlyPlayed.mockResolvedValueOnce({
      items: [
        {
          played_at: "2024-01-01",
          track: {
            id: "t1",
            name: "T",
            duration_ms: 1,
            artists: [{ id: "a", name: "A" }],
          },
        },
      ],
    });
    const { result } = renderHook(() =>
      useSpotifyStats({ type: "recentlyPlayed" }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetRecentlyPlayed).toHaveBeenCalledWith({ limit: 20 });
    expect(result.current.recentlyPlayed).toHaveLength(1);
  });

  it("captures error message on failure", async () => {
    mockGetTopTracks.mockRejectedValueOnce(new Error("network"));
    const { result } = renderHook(() => useSpotifyStats({ type: "topTracks" }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("network");
  });

  it("does not fetch when enabled is false", async () => {
    const { result } = renderHook(() =>
      useSpotifyStats({ type: "topTracks", enabled: false }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetTopTracks).not.toHaveBeenCalled();
  });
});
