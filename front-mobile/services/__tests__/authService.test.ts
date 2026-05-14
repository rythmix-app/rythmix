process.env.EXPO_PUBLIC_API_URL = "https://api.rythmix.test";

import { refreshAccessToken, resendVerificationEmail } from "../authService";
import { post } from "../api";

jest.mock("../api", () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

jest.mock("../storage", () => ({
  setToken: jest.fn(),
  setRefreshToken: jest.fn(),
  setUser: jest.fn(),
  clearAll: jest.fn(),
}));

const mockPost = post as jest.MockedFunction<typeof post>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("authService.resendVerificationEmail", () => {
  it("POSTs to /api/auth/resend-verification with email and skipAuth", async () => {
    mockPost.mockResolvedValueOnce({ message: "ok" });

    await resendVerificationEmail("user@example.com");

    expect(mockPost).toHaveBeenCalledWith(
      "/api/auth/resend-verification",
      { email: "user@example.com" },
      { skipAuth: true },
    );
  });

  it("propagates API errors to the caller", async () => {
    const apiError = { message: "Rate limited", statusCode: 429 };
    mockPost.mockRejectedValueOnce(apiError);

    await expect(resendVerificationEmail("user@example.com")).rejects.toEqual(
      apiError,
    );
  });
});

describe("authService.refreshAccessToken", () => {
  it("POSTs to /api/auth/refresh with skipRefresh to short-circuit the 401 refresh loop", async () => {
    // Regression guard: without skipRefresh: true on the refresh call itself,
    // a 401 on /api/auth/refresh re-enters handleTokenRefresh and awaits the
    // same in-flight refreshPromise → deadlock → splash stuck on launch.
    mockPost.mockResolvedValueOnce({ accessToken: "new-token" });

    await refreshAccessToken("refresh-token");

    expect(mockPost).toHaveBeenCalledWith(
      "/api/auth/refresh",
      { refreshToken: "refresh-token" },
      { skipAuth: true, skipRefresh: true },
    );
  });
});
