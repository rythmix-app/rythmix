process.env.EXPO_PUBLIC_API_URL = "https://api.rythmix.test";

import {
  buildSpotifyAuthUrl,
  disconnectSpotify,
  getRecentlyPlayed,
  getSpotifyStatus,
  getTopArtists,
  getTopTracks,
} from "../spotifyService";
import { del, get } from "../api";

jest.mock("../api", () => ({
  get: jest.fn(),
  del: jest.fn(),
}));

const mockGet = get as jest.MockedFunction<typeof get>;
const mockDel = del as jest.MockedFunction<typeof del>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("spotifyService", () => {
  it("getSpotifyStatus hits /api/me/spotify/status", async () => {
    mockGet.mockResolvedValueOnce({
      connected: true,
      providerUserId: "abc",
      scopes: "user-read-email",
    });
    const result = await getSpotifyStatus();
    expect(mockGet).toHaveBeenCalledWith("/api/me/spotify/status");
    expect(result.connected).toBe(true);
  });

  it("disconnectSpotify calls DELETE /api/me/spotify", async () => {
    mockDel.mockResolvedValueOnce(undefined);
    await disconnectSpotify();
    expect(mockDel).toHaveBeenCalledWith("/api/me/spotify");
  });

  it("getTopTracks serializes timeRange and limit", async () => {
    mockGet.mockResolvedValueOnce({ items: [] });
    await getTopTracks({ timeRange: "short_term", limit: 10 });
    expect(mockGet).toHaveBeenCalledWith(
      "/api/me/spotify/top-tracks?timeRange=short_term&limit=10",
    );
  });

  it("getTopTracks skips undefined query params", async () => {
    mockGet.mockResolvedValueOnce({ items: [] });
    await getTopTracks();
    expect(mockGet).toHaveBeenCalledWith("/api/me/spotify/top-tracks");
  });

  it("getTopArtists sends timeRange", async () => {
    mockGet.mockResolvedValueOnce({ items: [] });
    await getTopArtists({ timeRange: "long_term" });
    expect(mockGet).toHaveBeenCalledWith(
      "/api/me/spotify/top-artists?timeRange=long_term",
    );
  });

  it("getRecentlyPlayed sends limit only", async () => {
    mockGet.mockResolvedValueOnce({ items: [] });
    await getRecentlyPlayed({ limit: 5 });
    expect(mockGet).toHaveBeenCalledWith(
      "/api/me/spotify/recently-played?limit=5",
    );
  });

  it("buildSpotifyAuthUrl appends the user token and returnUrl", () => {
    const url = buildSpotifyAuthUrl("my-token", "frontmobile://spotify-linked");
    expect(url).toContain("/api/auth/spotify/redirect");
    expect(url).toContain("token=my-token");
    expect(url).toContain("returnUrl=frontmobile%3A%2F%2Fspotify-linked");
  });
});
