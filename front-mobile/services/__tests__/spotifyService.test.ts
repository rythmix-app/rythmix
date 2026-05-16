process.env.EXPO_PUBLIC_API_URL = "https://api.rythmix.test";

import {
  disconnectSpotify,
  getRecentlyPlayed,
  getSpotifyStatus,
  getTopArtists,
  getTopTracks,
  initSpotifyAuth,
  syncSpotifyLikedPlaylist,
} from "../spotifyService";
import { del, get, post } from "../api";

jest.mock("../api", () => ({
  get: jest.fn(),
  del: jest.fn(),
  post: jest.fn(),
}));

const mockGet = get as jest.MockedFunction<typeof get>;
const mockDel = del as jest.MockedFunction<typeof del>;
const mockPost = post as jest.MockedFunction<typeof post>;

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

  it("initSpotifyAuth posts the returnUrl to /api/auth/spotify/init", async () => {
    mockPost.mockResolvedValueOnce({
      authorizeUrl: "https://accounts.spotify.com/authorize?state=abc",
    });
    const result = await initSpotifyAuth("frontmobile://spotify-linked");
    expect(mockPost).toHaveBeenCalledWith("/api/auth/spotify/init", {
      returnUrl: "frontmobile://spotify-linked",
    });
    expect(result.authorizeUrl).toContain("accounts.spotify.com");
  });

  it("syncSpotifyLikedPlaylist posts to /api/me/spotify/playlist/sync and unwraps result", async () => {
    mockPost.mockResolvedValueOnce({
      result: { added: 3, notOnSpotify: 1, skipped: 0 },
    });
    const result = await syncSpotifyLikedPlaylist();
    expect(mockPost).toHaveBeenCalledWith("/api/me/spotify/playlist/sync", {});
    expect(result).toEqual({ added: 3, notOnSpotify: 1, skipped: 0 });
  });
});
