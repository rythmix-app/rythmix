import { deezerAPI } from "../deezer-api";
import { cacheManager } from "../cache-manager";
import { DeezerAPIError } from "../../types/errors";

// Mock dependencies
jest.mock("../cache-manager");
jest.mock("../retry-helper", () => ({
  retryWithBackoff: jest.fn((fn) => fn()),
  fetchWithTimeout: jest.fn((url, options) => fetch(url, options)),
}));

describe("DeezerAPI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    (cacheManager.getOrSet as jest.Mock).mockImplementation((key, fetchFn) =>
      fetchFn(),
    );
  });

  const mockTrack = {
    id: 1,
    title: "Test Track",
    title_short: "Test",
    title_version: "",
    link: "https://deezer.com/track/1",
    duration: 180,
    rank: 500000,
    explicit_lyrics: false,
    explicit_content_lyrics: 0,
    explicit_content_cover: 0,
    preview: "https://cdns-preview.dzcdn.net/stream/1.mp3",
    md5_image: "abc123",
    artist: {
      id: 1,
      name: "Artist",
      link: "https://deezer.com/artist/1",
      picture: "https://api.deezer.com/artist/1/image",
      picture_small: "https://api.deezer.com/artist/1/image?size=small",
      picture_medium: "https://api.deezer.com/artist/1/image?size=medium",
      picture_big: "https://api.deezer.com/artist/1/image?size=big",
      picture_xl: "https://api.deezer.com/artist/1/image?size=xl",
      tracklist: "https://api.deezer.com/artist/1/top",
      type: "artist",
    },
    album: {
      id: 1,
      title: "Album",
      cover: "https://api.deezer.com/album/1/image",
      cover_small: "https://api.deezer.com/album/1/image?size=small",
      cover_medium: "https://api.deezer.com/album/1/image?size=medium",
      cover_big: "https://api.deezer.com/album/1/image?size=big",
      cover_xl: "https://api.deezer.com/album/1/image?size=xl",
      md5_image: "def456",
      tracklist: "https://api.deezer.com/album/1/tracks",
      type: "album",
    },
    type: "track",
  };

  describe("searchTracks", () => {
    it("should search for tracks successfully", async () => {
      const mockResponse = {
        data: [mockTrack],
        total: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await deezerAPI.searchTracks("test");

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/search?q=test"),
        {},
      );
    });

    it("should use cache when enabled", async () => {
      deezerAPI.setCacheEnabled(true);
      (cacheManager.getOrSet as jest.Mock).mockResolvedValueOnce({
        data: [mockTrack],
        total: 1,
      });

      await deezerAPI.searchTracks("test");

      expect(cacheManager.getOrSet).toHaveBeenCalled();
    });

    it("should not use cache when disabled", async () => {
      deezerAPI.setCacheEnabled(false);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockTrack], total: 1 }),
      });

      await deezerAPI.searchTracks("test");

      expect(cacheManager.getOrSet).not.toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalled();

      // Re-enable cache for other tests
      deezerAPI.setCacheEnabled(true);
    });

    it("should handle 404 errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: "Not found" } }),
      });

      await expect(deezerAPI.searchTracks("test")).rejects.toThrow(
        DeezerAPIError,
      );
    });

    it("should handle 429 quota errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: "Quota exceeded" } }),
      });

      await expect(deezerAPI.searchTracks("test")).rejects.toMatchObject({
        statusCode: 429,
        type: "QUOTA",
      });
    });

    it("should handle network errors", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new TypeError("fetch failed"),
      );

      await expect(deezerAPI.searchTracks("test")).rejects.toThrow(
        DeezerAPIError,
      );
    });

    it("should encode query parameters correctly", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], total: 0 }),
      });

      await deezerAPI.searchTracks("test query with spaces", 20);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("test%20query%20with%20spaces"),
        {},
      );
    });
  });

  describe("getTopTracks", () => {
    it("should fetch top tracks successfully", async () => {
      const mockResponse = {
        data: [mockTrack],
        total: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await deezerAPI.getTopTracks(10);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/chart/0/tracks?limit=10"),
        {},
      );
    });
  });

  describe("getArtistTopTracks", () => {
    it("should fetch artist top tracks successfully", async () => {
      const mockResponse = {
        data: [mockTrack],
        total: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await deezerAPI.getArtistTopTracks(123, 5);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/artist/123/top?limit=5"),
        {},
      );
    });
  });

  describe("getTrack", () => {
    it("should fetch single track successfully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrack,
      });

      const result = await deezerAPI.getTrack(1);

      expect(result).toEqual(mockTrack);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/track/1"),
        {},
      );
    });

    it("should handle track not found", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: "Track not found" } }),
      });

      await expect(deezerAPI.getTrack(999)).rejects.toMatchObject({
        statusCode: 404,
        type: "NOT_FOUND",
      });
    });
  });

  describe("getGenres", () => {
    it("should fetch genres successfully", async () => {
      const mockGenres = {
        data: [
          {
            id: 1,
            name: "Rock",
            picture: "https://api.deezer.com/genre/1/image",
            picture_small: "https://api.deezer.com/genre/1/image?size=small",
            picture_medium: "https://api.deezer.com/genre/1/image?size=medium",
            picture_big: "https://api.deezer.com/genre/1/image?size=big",
            picture_xl: "https://api.deezer.com/genre/1/image?size=xl",
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGenres,
      });

      const result = await deezerAPI.getGenres();

      expect(result).toEqual(mockGenres);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/genre"),
        {},
      );
    });
  });

  describe("getRecommendations", () => {
    it("should fetch recommendations without genres", async () => {
      const mockResponse = {
        data: [mockTrack],
        total: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await deezerAPI.getRecommendations();

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/chart/0/tracks"),
        {},
      );
    });

    it("should fetch recommendations with genres", async () => {
      const mockResponse = {
        data: [mockTrack],
        total: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await deezerAPI.getRecommendations(["1", "2"]);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/genre/1/artists"),
        {},
      );
    });
  });

  describe("getPlaylist", () => {
    it("should fetch playlist successfully", async () => {
      const mockPlaylist = {
        id: 1,
        title: "Test Playlist",
        description: "Test Description",
        duration: 3600,
        public: true,
        nb_tracks: 10,
        fans: 100,
        link: "https://deezer.com/playlist/1",
        picture: "https://api.deezer.com/playlist/1/image",
        picture_small: "https://api.deezer.com/playlist/1/image?size=small",
        picture_medium: "https://api.deezer.com/playlist/1/image?size=medium",
        picture_big: "https://api.deezer.com/playlist/1/image?size=big",
        picture_xl: "https://api.deezer.com/playlist/1/image?size=xl",
        creator: {
          id: 1,
          name: "Creator",
        },
        tracks: {
          data: [mockTrack],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlaylist,
      });

      const result = await deezerAPI.getPlaylist(1);

      expect(result).toEqual(mockPlaylist);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/playlist/1"),
        {},
      );
    });
  });

  describe("clearCache", () => {
    it("should clear cache manager", async () => {
      (cacheManager.clear as jest.Mock).mockResolvedValueOnce(undefined);

      await deezerAPI.clearCache();

      expect(cacheManager.clear).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should handle 500 server errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: "Internal server error" } }),
      });

      await expect(deezerAPI.searchTracks("test")).rejects.toMatchObject({
        statusCode: 500,
        type: "NETWORK",
      });
    });

    it("should handle 503 service unavailable", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: { message: "Service unavailable" } }),
      });

      await expect(deezerAPI.searchTracks("test")).rejects.toMatchObject({
        statusCode: 503,
        type: "NETWORK",
      });
    });

    it("should handle JSON parse errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      await expect(deezerAPI.searchTracks("test")).rejects.toThrow();
    });

    it("should handle response without parseable error message", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new SyntaxError("Invalid JSON");
        },
      });

      await expect(deezerAPI.searchTracks("test")).rejects.toMatchObject({
        statusCode: 500,
        type: "NETWORK",
      });
    });

    it("should not retry non-DeezerAPIError in fetchWithRetry", async () => {
      const regularError = new Error("Regular error");
      (global.fetch as jest.Mock).mockRejectedValueOnce(regularError);

      await expect(deezerAPI.searchTracks("test")).rejects.toThrow();
    });
  });

  describe("cache integration", () => {
    it("should use correct cache keys for different methods", async () => {
      deezerAPI.setCacheEnabled(true);
      (cacheManager.getOrSet as jest.Mock).mockImplementation((key, fetchFn) =>
        fetchFn(),
      );
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], total: 0 }),
      });

      await deezerAPI.searchTracks("query", 10);
      expect(cacheManager.getOrSet).toHaveBeenCalledWith(
        "search:query:10",
        expect.any(Function),
        expect.any(Number),
      );

      await deezerAPI.getTopTracks(20);
      expect(cacheManager.getOrSet).toHaveBeenCalledWith(
        "top_tracks:20:0",
        expect.any(Function),
        expect.any(Number),
      );

      await deezerAPI.getArtistTopTracks(123, 15);
      expect(cacheManager.getOrSet).toHaveBeenCalledWith(
        "artist_top:123:15",
        expect.any(Function),
        expect.any(Number),
      );

      await deezerAPI.getTrack(456);
      expect(cacheManager.getOrSet).toHaveBeenCalledWith(
        "track:456",
        expect.any(Function),
        expect.any(Number),
      );
    });

    it("should bypass cache when disabled for all methods", async () => {
      deezerAPI.setCacheEnabled(false);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], total: 0 }),
      });

      // Clear previous mock calls
      (cacheManager.getOrSet as jest.Mock).mockClear();
      (global.fetch as jest.Mock).mockClear();

      await deezerAPI.getTopTracks(10);
      expect(cacheManager.getOrSet).not.toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalled();

      await deezerAPI.getArtistTopTracks(123, 10);
      expect(cacheManager.getOrSet).not.toHaveBeenCalled();

      await deezerAPI.getTrack(1);
      expect(cacheManager.getOrSet).not.toHaveBeenCalled();

      await deezerAPI.getGenres();
      expect(cacheManager.getOrSet).not.toHaveBeenCalled();

      await deezerAPI.getRecommendations();
      expect(cacheManager.getOrSet).not.toHaveBeenCalled();

      await deezerAPI.getPlaylist(1);
      expect(cacheManager.getOrSet).not.toHaveBeenCalled();

      // Re-enable cache for other tests
      deezerAPI.setCacheEnabled(true);
    });
  });
});
