process.env.EXPO_PUBLIC_API_URL = "https://api.rythmix.test";

import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { WebBrowserResultType } from "expo-web-browser";

import { startOAuthFlow } from "../authService";

jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: jest.fn(),
  WebBrowserResultType: {
    CANCEL: "cancel",
    DISMISS: "dismiss",
    LOCKED: "locked",
    OPENED: "opened",
  },
}));

jest.mock("expo-linking", () => ({
  createURL: jest.fn(() => "frontmobile://auth/oauth-callback"),
  parse: jest.fn(),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn(),
}));

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
}));

const mockOpenAuth = WebBrowser.openAuthSessionAsync as jest.MockedFunction<
  typeof WebBrowser.openAuthSessionAsync
>;
const mockLinkingParse = Linking.parse as jest.MockedFunction<
  typeof Linking.parse
>;
const mockReplace = router.replace as jest.MockedFunction<
  typeof router.replace
>;

const originalFetch = globalThis.fetch;

afterAll(() => {
  globalThis.fetch = originalFetch;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("authService.startOAuthFlow", () => {
  it("opens the Google /redirect endpoint with a returnUrl and forwards parsed params on success", async () => {
    mockOpenAuth.mockResolvedValueOnce({
      type: "success",
      url: "frontmobile://auth/oauth-callback?status=ok&accessToken=AT&refreshToken=RT",
    });
    mockLinkingParse.mockReturnValueOnce({
      scheme: "frontmobile",
      hostname: null,
      path: "auth/oauth-callback",
      queryParams: { status: "ok", accessToken: "AT", refreshToken: "RT" },
    } as unknown as ReturnType<typeof Linking.parse>);

    await startOAuthFlow("google");

    expect(mockOpenAuth).toHaveBeenCalledTimes(1);
    const [authorizeUrl, returnUrl] = mockOpenAuth.mock.calls[0];
    expect(authorizeUrl).toContain("/api/auth/google/redirect");
    expect(authorizeUrl).toContain(
      `returnUrl=${encodeURIComponent("frontmobile://auth/oauth-callback")}`,
    );
    expect(returnUrl).toBe("frontmobile://auth/oauth-callback");

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/auth/oauth-callback",
      params: expect.objectContaining({
        status: "ok",
        accessToken: "AT",
        refreshToken: "RT",
        provider: "google",
      }),
    });
  });

  it("fetches the Spotify authorize URL from /spotify/login/init before opening the browser", async () => {
    globalThis.fetch = jest.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          authorizeUrl: "https://accounts.spotify.com/authorize?x=1",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as unknown as typeof fetch;

    mockOpenAuth.mockResolvedValueOnce({
      type: "success",
      url: "frontmobile://auth/oauth-callback?status=pending_confirmation&email=foo@bar.com",
    });
    mockLinkingParse.mockReturnValueOnce({
      scheme: "frontmobile",
      hostname: null,
      path: "auth/oauth-callback",
      queryParams: { status: "pending_confirmation", email: "foo@bar.com" },
    } as unknown as ReturnType<typeof Linking.parse>);

    await startOAuthFlow("spotify");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/spotify/login/init?returnUrl="),
      expect.objectContaining({ method: "GET" }),
    );
    expect(mockOpenAuth).toHaveBeenCalledWith(
      "https://accounts.spotify.com/authorize?x=1",
      "frontmobile://auth/oauth-callback",
    );
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/auth/oauth-callback",
      params: expect.objectContaining({
        status: "pending_confirmation",
        email: "foo@bar.com",
        provider: "spotify",
      }),
    });
  });

  it("navigates to oauth-callback with reason=oauth_cancelled when the user cancels", async () => {
    mockOpenAuth.mockResolvedValueOnce({ type: WebBrowserResultType.CANCEL });

    await startOAuthFlow("google");

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/auth/oauth-callback",
      params: {
        status: "error",
        provider: "google",
        reason: "oauth_cancelled",
      },
    });
  });

  it("navigates to oauth-callback with reason=oauth_error when Spotify init fails", async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response("oops", { status: 500 }),
      ) as unknown as typeof fetch;

    await startOAuthFlow("spotify");

    expect(mockOpenAuth).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/auth/oauth-callback",
      params: {
        status: "error",
        provider: "spotify",
        reason: "oauth_error",
      },
    });
  });
});
