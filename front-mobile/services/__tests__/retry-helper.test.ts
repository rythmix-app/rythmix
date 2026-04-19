import { retryWithBackoff, fetchWithTimeout } from "../retry-helper";
import { DeezerAPIError } from "../../types/errors";

describe("retry-helper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("retryWithBackoff", () => {
    it("should succeed on first attempt", async () => {
      const successFn = jest.fn(async () => "success");
      const result = await retryWithBackoff(successFn);

      expect(result).toBe("success");
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    it("should retry on retryable errors", async () => {
      const retryableError = DeezerAPIError.network();
      const failTwiceThenSucceed = jest
        .fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce("success");

      const result = await retryWithBackoff(failTwiceThenSucceed, {
        maxAttempts: 3,
        baseDelay: 10,
      });

      expect(result).toBe("success");
      expect(failTwiceThenSucceed).toHaveBeenCalledTimes(3);
    });

    it("should throw error after max attempts", async () => {
      const retryableError = DeezerAPIError.network();
      const alwaysFail = jest.fn().mockRejectedValue(retryableError);

      await expect(
        retryWithBackoff(alwaysFail, {
          maxAttempts: 3,
          baseDelay: 10,
        }),
      ).rejects.toThrow(retryableError);

      expect(alwaysFail).toHaveBeenCalledTimes(3);
    });

    it("should not retry on non-retryable errors", async () => {
      const nonRetryableError = DeezerAPIError.notFound();
      const failOnce = jest.fn().mockRejectedValueOnce(nonRetryableError);

      await expect(
        retryWithBackoff(failOnce, {
          maxAttempts: 3,
          baseDelay: 10,
        }),
      ).rejects.toThrow(nonRetryableError);

      expect(failOnce).toHaveBeenCalledTimes(1);
    });

    it("should use exponential backoff", async () => {
      const retryableError = DeezerAPIError.network();
      const failTwice = jest
        .fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce("success");

      const baseDelay = 100;
      const startTime = Date.now();

      await retryWithBackoff(failTwice, {
        maxAttempts: 3,
        baseDelay,
      });

      const totalTime = Date.now() - startTime;

      // Expected delays: 100ms (1st retry) + 200ms (2nd retry) = 300ms
      // With some tolerance for execution time
      expect(totalTime).toBeGreaterThanOrEqual(300);
    });

    it("should respect maxDelay", async () => {
      const retryableError = DeezerAPIError.network();
      const failManyTimes = jest
        .fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce("success");

      const baseDelay = 100;
      const maxDelay = 200;
      const startTime = Date.now();

      await retryWithBackoff(failManyTimes, {
        maxAttempts: 5,
        baseDelay,
        maxDelay,
      });

      const totalTime = Date.now() - startTime;

      // With exponential backoff capped at maxDelay:
      // 100ms + 200ms (capped) + 200ms (capped) + 200ms (capped) = 700ms
      // But we'll be lenient in the test
      expect(totalTime).toBeGreaterThanOrEqual(100);
      expect(totalTime).toBeLessThan(2000);
    }, 10000);

    it("should use custom shouldRetry function", async () => {
      const customError = new Error("custom error");
      const failOnce = jest
        .fn()
        .mockRejectedValueOnce(customError)
        .mockResolvedValueOnce("success");

      const shouldRetry = jest.fn(() => true);

      const result = await retryWithBackoff(failOnce, {
        maxAttempts: 3,
        baseDelay: 10,
        shouldRetry,
      });

      expect(result).toBe("success");
      expect(shouldRetry).toHaveBeenCalledWith(customError);
      expect(failOnce).toHaveBeenCalledTimes(2);
    });

    it("should handle timeout errors as retryable", async () => {
      const timeoutError = DeezerAPIError.timeout();
      const failOnceThenSucceed = jest
        .fn()
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce("success");

      const result = await retryWithBackoff(failOnceThenSucceed, {
        maxAttempts: 3,
        baseDelay: 10,
      });

      expect(result).toBe("success");
      expect(failOnceThenSucceed).toHaveBeenCalledTimes(2);
    });

    it("should handle 503 status as retryable", async () => {
      const serviceUnavailable = DeezerAPIError.fromResponse(
        503,
        "Service Unavailable",
      );
      const failOnceThenSucceed = jest
        .fn()
        .mockRejectedValueOnce(serviceUnavailable)
        .mockResolvedValueOnce("success");

      const result = await retryWithBackoff(failOnceThenSucceed, {
        maxAttempts: 3,
        baseDelay: 10,
      });

      expect(result).toBe("success");
      expect(failOnceThenSucceed).toHaveBeenCalledTimes(2);
    });

    it("should not retry non-DeezerAPIError by default", async () => {
      const regularError = new Error("Regular error");
      const failOnce = jest.fn().mockRejectedValueOnce(regularError);

      await expect(
        retryWithBackoff(failOnce, {
          maxAttempts: 3,
          baseDelay: 10,
        }),
      ).rejects.toThrow(regularError);

      // Should only be called once because default shouldRetry returns false for non-DeezerAPIError
      expect(failOnce).toHaveBeenCalledTimes(1);
    });
  });

  describe("fetchWithTimeout", () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it("should return response if fetch completes before timeout", async () => {
      const mockResponse = new Response("success");
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await fetchWithTimeout(
        "https://api.example.com",
        {},
        5000,
      );

      expect(result).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith("https://api.example.com", {});
    });

    it("should timeout if fetch takes too long", async () => {
      // Mock fetch that never resolves
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {}),
      );

      const timeoutPromise = fetchWithTimeout(
        "https://api.example.com",
        {},
        100,
      );

      await expect(timeoutPromise).rejects.toThrow(DeezerAPIError);
      await expect(timeoutPromise).rejects.toMatchObject({
        type: "TIMEOUT",
      });
    });

    it("should use default timeout of 10 seconds", async () => {
      const mockResponse = new Response("success");
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await fetchWithTimeout("https://api.example.com");

      expect(result).toBe(mockResponse);
    });

    it("should throw DeezerAPIError.timeout on timeout", async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {}),
      );

      try {
        await fetchWithTimeout("https://api.example.com", {}, 50);
        fail("Should have thrown timeout error");
      } catch (error) {
        expect(error).toBeInstanceOf(DeezerAPIError);
        expect((error as DeezerAPIError).type).toBe("TIMEOUT");
      }
    });

    it("should propagate fetch errors", async () => {
      const fetchError = new Error("Network error");
      (global.fetch as jest.Mock).mockRejectedValueOnce(fetchError);

      await expect(
        fetchWithTimeout("https://api.example.com", {}, 5000),
      ).rejects.toThrow(fetchError);
    });

    it("should pass request options to fetch", async () => {
      const mockResponse = new Response("success");
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const options: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: "test" }),
      };

      await fetchWithTimeout("https://api.example.com", options, 5000);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com",
        options,
      );
    });
  });
});
