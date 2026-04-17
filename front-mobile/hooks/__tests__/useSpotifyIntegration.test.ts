import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useSpotifyIntegration } from "../useSpotifyIntegration";
import { disconnectSpotify, getSpotifyStatus } from "@/services/spotifyService";
import { useAuthStore } from "@/stores/authStore";

jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: jest.fn(),
}));

jest.mock("expo-linking", () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  parse: jest.fn(),
  createURL: jest.fn(() => "frontmobile://spotify-linked"),
}));

jest.mock("@/services/spotifyService", () => ({
  getSpotifyStatus: jest.fn(),
  disconnectSpotify: jest.fn(),
  buildSpotifyAuthUrl: jest.fn(
    () =>
      "https://api/auth/spotify/redirect?token=t&returnUrl=frontmobile%3A%2F%2Fspotify-linked",
  ),
}));

const mockGetState = jest.fn(() => ({ token: "my-token" as string | null }));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: Object.assign(jest.fn(), { getState: jest.fn() }),
}));

const mockGetStatus = getSpotifyStatus as jest.MockedFunction<
  typeof getSpotifyStatus
>;
const mockDisconnect = disconnectSpotify as jest.MockedFunction<
  typeof disconnectSpotify
>;
const mockOpenAuth = WebBrowser.openAuthSessionAsync as jest.MockedFunction<
  typeof WebBrowser.openAuthSessionAsync
>;
const mockParse = Linking.parse as jest.MockedFunction<typeof Linking.parse>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetState.mockReturnValue({ token: "my-token" });
  (useAuthStore.getState as jest.Mock).mockImplementation(mockGetState);
});

describe("useSpotifyIntegration", () => {
  it("fetches the status on mount", async () => {
    mockGetStatus.mockResolvedValueOnce({
      connected: false,
      providerUserId: null,
      scopes: null,
    });

    const { result } = renderHook(() => useSpotifyIntegration());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.status?.connected).toBe(false);
  });

  it("surfaces errors on status failure", async () => {
    mockGetStatus.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useSpotifyIntegration());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.error).toBe("boom");
  });

  it("returns error when token is missing on connect()", async () => {
    mockGetState.mockReturnValue({ token: null });
    mockGetStatus.mockResolvedValueOnce({
      connected: false,
      providerUserId: null,
      scopes: null,
    });
    mockGetStatus.mockRejectedValueOnce(new Error("unauthorized"));

    const { result } = renderHook(() => useSpotifyIntegration());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: string = "";
    await act(async () => {
      outcome = await result.current.connect();
    });
    expect(outcome).toBe("error");
    expect(mockOpenAuth).not.toHaveBeenCalled();
  });

  it("refreshes status when WebBrowser returns status=ok", async () => {
    // 1) mount: not connected
    mockGetStatus.mockResolvedValueOnce({
      connected: false,
      providerUserId: null,
      scopes: null,
    });
    // 2) warmup inside connect(): still not connected
    mockGetStatus.mockResolvedValueOnce({
      connected: false,
      providerUserId: null,
      scopes: null,
    });
    // 3) refresh after WebBrowser success: connected
    mockGetStatus.mockResolvedValueOnce({
      connected: true,
      providerUserId: "spotify-1",
      scopes: "user-read-email",
    });

    mockOpenAuth.mockResolvedValueOnce({
      type: "success",
      url: "frontmobile://spotify-linked?status=ok",
    } as Awaited<ReturnType<typeof WebBrowser.openAuthSessionAsync>>);
    mockParse.mockReturnValueOnce({
      queryParams: { status: "ok" },
    } as unknown as ReturnType<typeof Linking.parse>);

    const { result } = renderHook(() => useSpotifyIntegration());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: string = "";
    await act(async () => {
      outcome = await result.current.connect();
    });

    expect(outcome).toBe("ok");
    // 1) on mount, 2) warmup inside connect(), 3) after success refresh
    expect(mockGetStatus).toHaveBeenCalledTimes(3);
    expect(result.current.status?.connected).toBe(true);
  });

  it("maps cancelled sessions to 'cancelled'", async () => {
    mockGetStatus.mockResolvedValueOnce({
      connected: false,
      providerUserId: null,
      scopes: null,
    });
    mockOpenAuth.mockResolvedValueOnce({ type: "cancel" } as Awaited<
      ReturnType<typeof WebBrowser.openAuthSessionAsync>
    >);

    const { result } = renderHook(() => useSpotifyIntegration());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: string = "";
    await act(async () => {
      outcome = await result.current.connect();
    });
    expect(outcome).toBe("cancelled");
  });

  it("reports error and reason when callback returns status=error", async () => {
    mockGetStatus.mockResolvedValueOnce({
      connected: false,
      providerUserId: null,
      scopes: null,
    });
    mockOpenAuth.mockResolvedValueOnce({
      type: "success",
      url: "frontmobile://spotify-linked?status=error&reason=access_denied",
    } as Awaited<ReturnType<typeof WebBrowser.openAuthSessionAsync>>);
    mockParse.mockReturnValueOnce({
      queryParams: { status: "error", reason: "access_denied" },
    } as unknown as ReturnType<typeof Linking.parse>);

    const { result } = renderHook(() => useSpotifyIntegration());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: string = "";
    await act(async () => {
      outcome = await result.current.connect();
    });

    expect(outcome).toBe("error");
    expect(result.current.error).toBe("access_denied");
  });

  it("calls disconnectSpotify and refreshes the status", async () => {
    mockGetStatus.mockResolvedValue({
      connected: true,
      providerUserId: "a",
      scopes: null,
    });
    mockDisconnect.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useSpotifyIntegration());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.disconnect();
    });
    expect(mockDisconnect).toHaveBeenCalled();
    // 1) on mount refresh, 2) refresh after disconnect
    expect(mockGetStatus).toHaveBeenCalledTimes(2);
  });
});
