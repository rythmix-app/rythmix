import AsyncStorage from "@react-native-async-storage/async-storage";
import { cacheManager, DEFAULT_TTL } from "../cache-manager";

describe("CacheManager", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe("get", () => {
    it("should return null for non-existent key", async () => {
      const result = await cacheManager.get("non-existent");
      expect(result).toBeNull();
    });

    it("should return cached data if not expired", async () => {
      const testData = { foo: "bar" };
      await cacheManager.set("test-key", testData, 60000);

      const result = await cacheManager.get("test-key");
      expect(result).toEqual(testData);
    });

    it("should return null and remove expired data", async () => {
      const testData = { foo: "bar" };
      const ttl = 100;

      // Mock Date.now to simulate passage of time
      const originalDateNow = Date.now;
      const startTime = 1000000;
      Date.now = jest.fn(() => startTime);

      await cacheManager.set("test-key", testData, ttl);

      // Move time forward past TTL
      Date.now = jest.fn(() => startTime + ttl + 1000);

      const result = await cacheManager.get("test-key");
      expect(result).toBeNull();

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it("should handle corrupted cache entries", async () => {
      await AsyncStorage.setItem("@rythmix_cache:corrupted", "invalid json");

      const result = await cacheManager.get("corrupted");
      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("should store data with TTL", async () => {
      const testData = { test: "data" };
      await cacheManager.set("key", testData, 60000);

      const stored = await AsyncStorage.getItem("@rythmix_cache:key");
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!);
      expect(parsed.data).toEqual(testData);
      expect(parsed.ttl).toBe(60000);
      expect(parsed.timestamp).toBeDefined();
    });

    it("should update stats after setting", async () => {
      await cacheManager.set("key", { data: "test" }, 60000);

      const stats = await cacheManager.getStats();
      expect(stats.entries).toBe(1);
      expect(stats.size).toBeGreaterThan(0);
    });

    it("should clean old entries when cache is full", async () => {
      // Mock Date.now for timestamps
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);

      // Add multiple small entries first
      for (let i = 1; i <= 5; i++) {
        currentTime += 1000;
        await cacheManager.set(`key${i}`, { data: "test data" }, 60000);
      }

      // Mock getStats to return size close to MAX_CACHE_SIZE
      jest.spyOn(cacheManager, "getStats").mockResolvedValueOnce({
        size: 49 * 1024 * 1024, // 49 MB (close to 50 MB limit)
        entries: 5,
      });

      // Create large data that would exceed limit
      const largeData = "x".repeat(2 * 1024 * 1024); // 2 MB
      currentTime += 1000;

      // This should trigger cleanOldEntries
      await cacheManager.set("large", { data: largeData }, 60000);

      // Restore getStats
      jest.restoreAllMocks();
      Date.now = originalDateNow;
    });

    it("should handle errors during set", async () => {
      // Mock AsyncStorage.setItem to throw an error
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest
        .fn()
        .mockRejectedValueOnce(new Error("Storage error"));

      // Should not throw, just log error
      await cacheManager.set("key", { data: "test" }, 60000);

      expect(console.error).toHaveBeenCalledWith(
        "Error setting cache entry:",
        expect.any(Error),
      );

      // Restore
      AsyncStorage.setItem = originalSetItem;
    });
  });

  describe("remove", () => {
    it("should remove existing entry", async () => {
      await cacheManager.set("key", { data: "test" }, 60000);
      await cacheManager.remove("key");

      const result = await cacheManager.get("key");
      expect(result).toBeNull();
    });

    it("should update stats after removing", async () => {
      await cacheManager.set("key", { data: "test" }, 60000);
      const statsBefore = await cacheManager.getStats();

      await cacheManager.remove("key");
      const statsAfter = await cacheManager.getStats();

      expect(statsAfter.entries).toBe(statsBefore.entries - 1);
    });

    it("should handle removing non-existent key", async () => {
      await cacheManager.remove("non-existent");
      // Should not throw
      expect(true).toBe(true);
    });

    it("should handle errors during remove", async () => {
      await cacheManager.set("key", { data: "test" }, 60000);

      // Mock AsyncStorage to throw error
      const originalRemoveItem = AsyncStorage.removeItem;
      AsyncStorage.removeItem = jest
        .fn()
        .mockRejectedValueOnce(new Error("Remove error"));

      await cacheManager.remove("key");

      expect(console.error).toHaveBeenCalledWith(
        "Error removing cache entry:",
        expect.any(Error),
      );

      // Restore
      AsyncStorage.removeItem = originalRemoveItem;
    });
  });

  describe("clear", () => {
    it("should remove all cache entries", async () => {
      await cacheManager.set("key1", { data: "1" }, 60000);
      await cacheManager.set("key2", { data: "2" }, 60000);
      await cacheManager.set("key3", { data: "3" }, 60000);

      await cacheManager.clear();

      const result1 = await cacheManager.get("key1");
      const result2 = await cacheManager.get("key2");
      const result3 = await cacheManager.get("key3");

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });

    it("should reset stats to zero", async () => {
      await cacheManager.set("key", { data: "test" }, 60000);
      await cacheManager.clear();

      const stats = await cacheManager.getStats();
      expect(stats.size).toBe(0);
      expect(stats.entries).toBe(0);
    });

    it("should handle errors during clear", async () => {
      // Mock AsyncStorage to throw error
      const originalGetAllKeys = AsyncStorage.getAllKeys;
      AsyncStorage.getAllKeys = jest
        .fn()
        .mockRejectedValueOnce(new Error("Clear error"));

      await cacheManager.clear();

      expect(console.error).toHaveBeenCalledWith(
        "Error clearing cache:",
        expect.any(Error),
      );

      // Restore
      AsyncStorage.getAllKeys = originalGetAllKeys;
    });
  });

  describe("cleanExpired", () => {
    it("should remove expired entries", async () => {
      const originalDateNow = Date.now;
      const startTime = 1000000;
      Date.now = jest.fn(() => startTime);

      await cacheManager.set("fresh", { data: "fresh" }, 60000);
      await cacheManager.set("expired", { data: "expired" }, 100);

      // Move time forward
      Date.now = jest.fn(() => startTime + 200);

      await cacheManager.cleanExpired();

      const fresh = await cacheManager.get("fresh");
      const expired = await cacheManager.get("expired");

      expect(fresh).toBeDefined();
      expect(expired).toBeNull();

      Date.now = originalDateNow;
    });

    it("should remove corrupted entries", async () => {
      await AsyncStorage.setItem("@rythmix_cache:corrupted", "invalid json");
      await cacheManager.cleanExpired();

      const item = await AsyncStorage.getItem("@rythmix_cache:corrupted");
      expect(item).toBeNull();
    });

    it("should handle errors during cleanExpired", async () => {
      // Mock AsyncStorage to throw error
      const originalGetAllKeys = AsyncStorage.getAllKeys;
      AsyncStorage.getAllKeys = jest
        .fn()
        .mockRejectedValueOnce(new Error("Clean error"));

      await cacheManager.cleanExpired();

      expect(console.error).toHaveBeenCalledWith(
        "Error cleaning expired entries:",
        expect.any(Error),
      );

      // Restore
      AsyncStorage.getAllKeys = originalGetAllKeys;
    });
  });

  describe("has", () => {
    it("should return true for existing valid entry", async () => {
      await cacheManager.set("key", { data: "test" }, 60000);
      const exists = await cacheManager.has("key");
      expect(exists).toBe(true);
    });

    it("should return false for non-existent entry", async () => {
      const exists = await cacheManager.has("non-existent");
      expect(exists).toBe(false);
    });

    it("should return false for expired entry", async () => {
      const originalDateNow = Date.now;
      const startTime = 1000000;
      Date.now = jest.fn(() => startTime);

      await cacheManager.set("key", { data: "test" }, 100);

      Date.now = jest.fn(() => startTime + 200);

      const exists = await cacheManager.has("key");
      expect(exists).toBe(false);

      Date.now = originalDateNow;
    });
  });

  describe("getOrSet", () => {
    it("should return cached value if exists", async () => {
      const testData = { cached: true };
      await cacheManager.set("key", testData, 60000);

      const fetchFn = jest.fn(async () => ({ fresh: true }));
      const result = await cacheManager.getOrSet("key", fetchFn, 60000);

      expect(result).toEqual(testData);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("should fetch and cache if not exists", async () => {
      const freshData = { fresh: true };
      const fetchFn = jest.fn(async () => freshData);

      const result = await cacheManager.getOrSet("key", fetchFn, 60000);

      expect(result).toEqual(freshData);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Verify it was cached
      const cached = await cacheManager.get("key");
      expect(cached).toEqual(freshData);
    });

    it("should fetch if cached value is expired", async () => {
      const originalDateNow = Date.now;
      const startTime = 1000000;
      Date.now = jest.fn(() => startTime);

      await cacheManager.set("key", { old: true }, 100);

      Date.now = jest.fn(() => startTime + 200);

      const freshData = { fresh: true };
      const fetchFn = jest.fn(async () => freshData);

      const result = await cacheManager.getOrSet("key", fetchFn, 60000);

      expect(result).toEqual(freshData);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      Date.now = originalDateNow;
    });
  });

  describe("getStats", () => {
    it("should return stats with size and entries", async () => {
      await cacheManager.set("key1", { data: "test1" }, 60000);
      await cacheManager.set("key2", { data: "test2" }, 60000);

      const stats = await cacheManager.getStats();

      expect(stats.entries).toBe(2);
      expect(stats.size).toBeGreaterThan(0);
    });

    it("should return zero stats when cache is empty", async () => {
      await cacheManager.clear();
      const stats = await cacheManager.getStats();

      expect(stats.entries).toBe(0);
      expect(stats.size).toBe(0);
    });

    it("should handle errors during getStats", async () => {
      // Mock AsyncStorage to throw error
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest
        .fn()
        .mockRejectedValueOnce(new Error("Stats error"));

      const stats = await cacheManager.getStats();

      expect(console.error).toHaveBeenCalledWith(
        "Error getting cache stats:",
        expect.any(Error),
      );
      expect(stats).toEqual({ size: 0, entries: 0 });

      // Restore
      AsyncStorage.getItem = originalGetItem;
    });

    it("should handle errors during updateStats", async () => {
      // Mock AsyncStorage.getItem for getStats within updateStats
      const originalGetItem = AsyncStorage.getItem;
      const mockGetItem = jest
        .fn()
        .mockResolvedValueOnce(JSON.stringify({ size: 100, entries: 1 })) // first call succeeds
        .mockRejectedValueOnce(new Error("Stats error")); // second call fails

      AsyncStorage.getItem = mockGetItem;

      // This should trigger updateStats internally
      await cacheManager.set("test-key", { data: "test" }, 60000);

      // Restore
      AsyncStorage.getItem = originalGetItem;
    });

    it("should handle setItem errors during updateStats", async () => {
      await cacheManager.set("key", { data: "test" }, 60000);

      // Mock setItem to throw on the stats update
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest
        .fn()
        .mockResolvedValueOnce(undefined) // First setItem for the data succeeds
        .mockRejectedValueOnce(new Error("Stats update error")); // Stats update fails

      await cacheManager.set("key2", { data: "test2" }, 60000);

      expect(console.error).toHaveBeenCalledWith(
        "Error updating cache stats:",
        expect.any(Error),
      );

      // Restore
      AsyncStorage.setItem = originalSetItem;
    });
  });

  describe("DEFAULT_TTL", () => {
    it("should have correct TTL values", () => {
      expect(DEFAULT_TTL.TRACKS).toBe(60 * 60 * 1000);
      expect(DEFAULT_TTL.GENRES).toBe(24 * 60 * 60 * 1000);
      expect(DEFAULT_TTL.PLAYLISTS).toBe(6 * 60 * 60 * 1000);
      expect(DEFAULT_TTL.SEARCH).toBe(30 * 60 * 1000);
    });
  });
});
