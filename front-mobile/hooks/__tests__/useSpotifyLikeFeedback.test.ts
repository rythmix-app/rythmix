import { act, renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSpotifyLikeFeedback } from "../useSpotifyLikeFeedback";
import { useSpotifyIntegration } from "../useSpotifyIntegration";
import { useToast } from "@/components/Toast";

jest.mock("../useSpotifyIntegration");
jest.mock("@/components/Toast");

const mockUseIntegration = useSpotifyIntegration as jest.MockedFunction<
  typeof useSpotifyIntegration
>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const PROMPT_KEY = "spotify_connect_prompt_last_shown_day";

const todayKey = (): string => new Date().toISOString().slice(0, 10);

const showToast = jest.fn();

const buildIntegration = (
  overrides: Partial<ReturnType<typeof useSpotifyIntegration>> = {},
) => ({
  status: { connected: false, providerUserId: null, scopes: null },
  isLoading: false,
  isConnecting: false,
  error: null,
  refresh: jest.fn(async () => undefined),
  connect: jest.fn(async () => "ok" as const),
  disconnect: jest.fn(async () => undefined),
  ...overrides,
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockUseToast.mockReturnValue({ show: showToast });
});

describe("useSpotifyLikeFeedback - connect modal", () => {
  it("shows the modal on the first like of the day when not connected", async () => {
    mockUseIntegration.mockReturnValue(buildIntegration());
    const { result } = renderHook(() => useSpotifyLikeFeedback());

    await act(async () => {
      await result.current.onLikeAttempted("liked");
    });

    expect(result.current.connectModalVisible).toBe(true);
    expect(await AsyncStorage.getItem(PROMPT_KEY)).toBe(todayKey());
  });

  it("does not show the modal twice the same day", async () => {
    mockUseIntegration.mockReturnValue(buildIntegration());
    await AsyncStorage.setItem(PROMPT_KEY, todayKey());
    const { result } = renderHook(() => useSpotifyLikeFeedback());

    await act(async () => {
      await result.current.onLikeAttempted("liked");
    });

    expect(result.current.connectModalVisible).toBe(false);
  });

  it("does not show the modal when the user is already connected", async () => {
    mockUseIntegration.mockReturnValue(
      buildIntegration({
        status: {
          connected: true,
          providerUserId: "abc",
          scopes: "playlist-modify-private",
        },
      }),
    );
    const { result } = renderHook(() => useSpotifyLikeFeedback());

    await act(async () => {
      await result.current.onLikeAttempted("liked");
    });

    expect(result.current.connectModalVisible).toBe(false);
    expect(await AsyncStorage.getItem(PROMPT_KEY)).toBeNull();
  });

  it("does not show the modal on a dislike", async () => {
    mockUseIntegration.mockReturnValue(buildIntegration());
    const { result } = renderHook(() => useSpotifyLikeFeedback());

    await act(async () => {
      await result.current.onLikeAttempted("disliked");
    });

    expect(result.current.connectModalVisible).toBe(false);
  });
});

describe("useSpotifyLikeFeedback - interaction result", () => {
  it("shows a warning toast when the track is not on Spotify", async () => {
    mockUseIntegration.mockReturnValue(buildIntegration());
    const { result } = renderHook(() => useSpotifyLikeFeedback());

    act(() => {
      result.current.onInteractionResult({
        triggered: true,
        notOnSpotify: true,
      });
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "warning" }),
    );
  });

  it("shows a warning toast and refreshes status when scope upgrade is required", async () => {
    const integration = buildIntegration();
    mockUseIntegration.mockReturnValue(integration);
    const { result } = renderHook(() => useSpotifyLikeFeedback());

    act(() => {
      result.current.onInteractionResult({
        triggered: false,
        scopeUpgradeRequired: true,
      });
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "warning" }),
    );
    await waitFor(() => expect(integration.refresh).toHaveBeenCalled());
  });

  it("does nothing when the result is undefined or empty", () => {
    mockUseIntegration.mockReturnValue(buildIntegration());
    const { result } = renderHook(() => useSpotifyLikeFeedback());

    act(() => {
      result.current.onInteractionResult(undefined);
      result.current.onInteractionResult({ triggered: true });
    });

    expect(showToast).not.toHaveBeenCalled();
  });
});
