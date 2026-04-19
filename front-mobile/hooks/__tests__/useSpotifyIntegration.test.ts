import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useSpotifyIntegration } from "../useSpotifyIntegration";
import {
  disconnectSpotify,
  getSpotifyStatus,
  initSpotifyAuth,
} from "@/services/spotifyService";

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
  initSpotifyAuth: jest.fn(),
}));

const mockGetStatus = getSpotifyStatus as jest.MockedFunction<
  typeof getSpotifyStatus
>;
const mockDisconnect = disconnectSpotify as jest.MockedFunction<
  typeof disconnectSpotify
>;
const mockInitAuth = initSpotifyAuth as jest.MockedFunction<
  typeof initSpotifyAuth
>;
const mockOpenAuth = WebBrowser.openAuthSessionAsync as jest.MockedFunction<
  typeof WebBrowser.openAuthSessionAsync
>;
const mockParse = Linking.parse as jest.MockedFunction<typeof Linking.parse>;

beforeEach(() => {
  jest.clearAllMocks();
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

  it("returns error when init endpoint fails", async () => {
    mockGetStatus.mockResolvedValueOnce({
      connected: false,
      providerUserId: null,
      scopes: null,
    });
    mockInitAuth.mockRejectedValueOnce(new Error("unauthorized"));

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
    mockGetStatus.mockResolvedValueOnce({
      connected: false,
      providerUserId: null,
      scopes: null,
    });
    mockGetStatus.mockResolvedValueOnce({
      connected: true,
      providerUserId: "spotify-1",
      scopes: "user-read-email",
    });

    mockInitAuth.mockResolvedValueOnce({
      authorizeUrl: "https://accounts.spotify.com/authorize?state=abc",
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
    expect(mockInitAuth).toHaveBeenCalledWith("frontmobile://spotify-linked");
    expect(mockOpenAuth).toHaveBeenCalledWith(
      "https://accounts.spotify.com/authorize?state=abc",
      "frontmobile://spotify-linked",
    );
    expect(result.current.status?.connected).toBe(true);
  });

  it("maps cancelled sessions to 'cancelled'", async () => {
    mockGetStatus.mockResolvedValueOnce({
      connected: false,
      providerUserId: null,
      scopes: null,
    });
    mockInitAuth.mockResolvedValueOnce({
      authorizeUrl: "https://accounts.spotify.com/authorize?state=abc",
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
    mockInitAuth.mockResolvedValueOnce({
      authorizeUrl: "https://accounts.spotify.com/authorize?state=abc",
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
    expect(mockGetStatus).toHaveBeenCalledTimes(2);
  });
});
