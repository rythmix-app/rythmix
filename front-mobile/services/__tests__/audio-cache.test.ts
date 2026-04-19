import { audioCache } from "../audio-cache";
import { DeezerTrack } from "../deezer-api";

const createMockTrack = (
  id: number,
  title: string = `Track ${id}`,
): DeezerTrack => ({
  id,
  title,
  title_short: title,
  title_version: "",
  link: `https://deezer.com/track/${id}`,
  duration: 180,
  rank: 500000,
  explicit_lyrics: false,
  explicit_content_lyrics: 0,
  explicit_content_cover: 0,
  preview: `https://cdns-preview.dzcdn.net/stream/${id}.mp3`,
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
});

describe("AudioCache", () => {
  beforeEach(() => {
    audioCache.clear();
  });

  describe("add", () => {
    it("should add track to cache", () => {
      const track = createMockTrack(1);
      audioCache.add(track);

      expect(audioCache.has(1)).toBe(true);
      expect(audioCache.get(1)).toEqual(track);
    });

    it("should update existing track", () => {
      const track1 = createMockTrack(1, "Original");
      const track2 = createMockTrack(1, "Updated");

      audioCache.add(track1);
      audioCache.add(track2);

      expect(audioCache.get(1)).toEqual(track2);
    });

    it("should remove oldest entry when cache is full", () => {
      // Mock Date.now to control timestamps
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);

      // Fill cache to MAX_ENTRIES (20)
      for (let i = 1; i <= 20; i++) {
        currentTime += 1000; // Increment time for each entry
        audioCache.add(createMockTrack(i));
      }

      expect(audioCache.size()).toBe(20);

      // Add one more, should remove oldest
      currentTime += 1000;
      audioCache.add(createMockTrack(21));

      expect(audioCache.size()).toBe(20);
      expect(audioCache.has(1)).toBe(false); // Oldest should be removed
      expect(audioCache.has(21)).toBe(true); // Newest should be added

      Date.now = originalDateNow;
    });
  });

  describe("get", () => {
    it("should return track if exists", () => {
      const track = createMockTrack(1);
      audioCache.add(track);

      expect(audioCache.get(1)).toEqual(track);
    });

    it("should return null if track does not exist", () => {
      expect(audioCache.get(999)).toBeNull();
    });
  });

  describe("has", () => {
    it("should return true if track exists", () => {
      audioCache.add(createMockTrack(1));
      expect(audioCache.has(1)).toBe(true);
    });

    it("should return false if track does not exist", () => {
      expect(audioCache.has(999)).toBe(false);
    });
  });

  describe("remove", () => {
    it("should remove track from cache", () => {
      audioCache.add(createMockTrack(1));
      expect(audioCache.has(1)).toBe(true);

      audioCache.remove(1);
      expect(audioCache.has(1)).toBe(false);
    });

    it("should handle removing non-existent track", () => {
      audioCache.remove(999);
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("clear", () => {
    it("should remove all tracks", () => {
      audioCache.add(createMockTrack(1));
      audioCache.add(createMockTrack(2));
      audioCache.add(createMockTrack(3));

      expect(audioCache.size()).toBe(3);

      audioCache.clear();

      expect(audioCache.size()).toBe(0);
      expect(audioCache.has(1)).toBe(false);
      expect(audioCache.has(2)).toBe(false);
      expect(audioCache.has(3)).toBe(false);
    });
  });

  describe("size", () => {
    it("should return correct cache size", () => {
      expect(audioCache.size()).toBe(0);

      audioCache.add(createMockTrack(1));
      expect(audioCache.size()).toBe(1);

      audioCache.add(createMockTrack(2));
      expect(audioCache.size()).toBe(2);

      audioCache.remove(1);
      expect(audioCache.size()).toBe(1);
    });
  });

  describe("cleanOld", () => {
    it("should remove entries older than 1 hour", () => {
      const originalDateNow = Date.now;
      const startTime = 1000000;
      Date.now = jest.fn(() => startTime);

      // Add some tracks
      audioCache.add(createMockTrack(1));
      audioCache.add(createMockTrack(2));

      // Move time forward past 1 hour
      Date.now = jest.fn(() => startTime + 61 * 60 * 1000);

      // Add a fresh track
      audioCache.add(createMockTrack(3));

      // Clean old entries
      audioCache.cleanOld();

      expect(audioCache.has(1)).toBe(false);
      expect(audioCache.has(2)).toBe(false);
      expect(audioCache.has(3)).toBe(true);

      Date.now = originalDateNow;
    });

    it("should not remove entries younger than 1 hour", () => {
      const originalDateNow = Date.now;
      const startTime = 1000000;
      Date.now = jest.fn(() => startTime);

      audioCache.add(createMockTrack(1));

      // Move time forward but less than 1 hour
      Date.now = jest.fn(() => startTime + 30 * 60 * 1000);

      audioCache.cleanOld();

      expect(audioCache.has(1)).toBe(true);

      Date.now = originalDateNow;
    });
  });

  describe("preloadNext", () => {
    it("should return next N tracks to preload", () => {
      const tracks = [
        createMockTrack(1),
        createMockTrack(2),
        createMockTrack(3),
        createMockTrack(4),
        createMockTrack(5),
      ];

      const toPreload = audioCache.preloadNext(tracks, 1);

      // Should return tracks at indices 2, 3, 4 (PRELOAD_COUNT = 3)
      expect(toPreload.length).toBeLessThanOrEqual(3);
    });

    it("should add next tracks to cache", () => {
      const tracks = [
        createMockTrack(1),
        createMockTrack(2),
        createMockTrack(3),
        createMockTrack(4),
      ];

      audioCache.preloadNext(tracks, 0);

      // Should have added tracks 2, 3, 4
      expect(audioCache.has(2)).toBe(true);
      expect(audioCache.has(3)).toBe(true);
      expect(audioCache.has(4)).toBe(true);
    });

    it("should handle edge case when near end of playlist", () => {
      const tracks = [
        createMockTrack(1),
        createMockTrack(2),
        createMockTrack(3),
      ];

      const toPreload = audioCache.preloadNext(tracks, 1);

      // Should only return track 3 (only 1 track left)
      expect(toPreload.length).toBeLessThanOrEqual(1);
      expect(audioCache.has(3)).toBe(true);
    });

    it("should handle last track in playlist", () => {
      const tracks = [createMockTrack(1), createMockTrack(2)];

      const toPreload = audioCache.preloadNext(tracks, 1);

      // No tracks to preload
      expect(toPreload.length).toBe(0);
    });

    it("should not return already cached tracks for preloading", () => {
      const tracks = [
        createMockTrack(1),
        createMockTrack(2),
        createMockTrack(3),
        createMockTrack(4),
      ];

      // Pre-add track 2 to cache
      audioCache.add(createMockTrack(2));

      const toPreload = audioCache.preloadNext(tracks, 0);

      // Track 2 is already cached, so only tracks 3 and 4 should be returned for preloading
      // (preloadNext tries to preload 3 tracks: indices 1, 2, 3 = track IDs 2, 3, 4)
      expect(toPreload.length).toBe(2);
      expect(toPreload[0].id).toBe(3);
      expect(toPreload[1].id).toBe(4);
    });

    it("should add all next tracks to cache during preload", () => {
      const tracks = [
        createMockTrack(1),
        createMockTrack(2),
        createMockTrack(3),
        createMockTrack(4),
        createMockTrack(5),
      ];

      audioCache.preloadNext(tracks, 0);

      // All PRELOAD_COUNT (3) next tracks should be in cache
      expect(audioCache.has(2)).toBe(true);
      expect(audioCache.has(3)).toBe(true);
      expect(audioCache.has(4)).toBe(true);
      expect(audioCache.has(5)).toBe(false); // Beyond PRELOAD_COUNT
    });
  });

  describe("getAll", () => {
    it("should return all cached tracks", () => {
      const track1 = createMockTrack(1);
      const track2 = createMockTrack(2);
      const track3 = createMockTrack(3);

      audioCache.add(track1);
      audioCache.add(track2);
      audioCache.add(track3);

      const allTracks = audioCache.getAll();

      expect(allTracks.length).toBe(3);
      expect(allTracks).toContainEqual(track1);
      expect(allTracks).toContainEqual(track2);
      expect(allTracks).toContainEqual(track3);
    });

    it("should return empty array when cache is empty", () => {
      const allTracks = audioCache.getAll();
      expect(allTracks).toEqual([]);
    });
  });

  describe("getStats", () => {
    it("should return correct stats", () => {
      audioCache.add(createMockTrack(1));
      audioCache.add(createMockTrack(2));

      const stats = audioCache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(20);
      expect(stats.usage).toBe(10); // 2/20 * 100
    });

    it("should return 0 usage when empty", () => {
      const stats = audioCache.getStats();

      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(20);
      expect(stats.usage).toBe(0);
    });

    it("should return 100 usage when full", () => {
      // Fill cache to MAX_ENTRIES
      for (let i = 1; i <= 20; i++) {
        audioCache.add(createMockTrack(i));
      }

      const stats = audioCache.getStats();

      expect(stats.size).toBe(20);
      expect(stats.maxSize).toBe(20);
      expect(stats.usage).toBe(100);
    });
  });
});
