import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useTracklistGame } from "../useTracklistGame";
import { deezerAPI, DeezerAlbum, DeezerTrack } from "@/services/deezer-api";
import { useLocalSearchParams } from "expo-router";
import {
  createGameSession,
  getMyActiveSession,
  updateGameSession,
} from "@/services/gameSessionService";
import {
  saveGameState,
  getGameState,
  deleteGameState,
} from "@/services/gameStorageService";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useToast } from "@/components/Toast";
import { useErrorFeedback } from "@/hooks/useErrorFeedback";

jest.mock("@/services/deezer-api");
jest.mock("@/services/gameSessionService");
jest.mock("@/services/gameStorageService");
jest.mock("@/stores/authStore");
jest.mock("@/stores/settingsStore");
jest.mock("@/components/Toast");
jest.mock("@/hooks/useErrorFeedback");
jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  router: { back: jest.fn(), push: jest.fn() },
}));

const mockDeezerAPI = deezerAPI as jest.Mocked<typeof deezerAPI>;
const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<
  typeof useLocalSearchParams
>;
const mockCreateGameSession = createGameSession as jest.MockedFunction<
  typeof createGameSession
>;
const mockGetMyActiveSession = getMyActiveSession as jest.MockedFunction<
  typeof getMyActiveSession
>;
const mockUpdateGameSession = updateGameSession as jest.MockedFunction<
  typeof updateGameSession
>;
const mockSaveGameState = saveGameState as jest.MockedFunction<
  typeof saveGameState
>;
const mockGetGameState = getGameState as jest.MockedFunction<
  typeof getGameState
>;
const mockDeleteGameState = deleteGameState as jest.MockedFunction<
  typeof deleteGameState
>;
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;
const mockUseSettingsStore = useSettingsStore as unknown as jest.Mock;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseErrorFeedback = useErrorFeedback as jest.MockedFunction<
  typeof useErrorFeedback
>;

const buildTrack = (id: number, title: string): DeezerTrack =>
  ({
    id,
    title,
    title_short: title,
    title_version: "",
    link: "",
    duration: 180,
    rank: 0,
    explicit_lyrics: false,
    explicit_content_lyrics: 0,
    explicit_content_cover: 0,
    preview: "",
    md5_image: "",
    artist: { id: 1, name: "Artist" },
    album: { id: 1, title: "Album" },
    type: "track",
  }) as unknown as DeezerTrack;

const buildAlbum = (id: number, title: string): DeezerAlbum =>
  ({
    id,
    title,
    cover: "",
    cover_small: "",
    cover_medium: "",
    cover_big: "",
    cover_xl: "",
    md5_image: "",
    genre_id: 0,
    release_date: "",
    record_type: "album",
    tracklist: "",
    explicit_lyrics: false,
    nb_tracks: 10,
    duration: 2000,
    fans: 0,
    type: "album",
    artist: { id: 1, name: "Artist" },
  }) as unknown as DeezerAlbum;

const sampleTracks: DeezerTrack[] = [
  buildTrack(101, "Sunset Boulevard"),
  buildTrack(102, "Midnight Drive"),
  buildTrack(103, "Ocean Eyes"),
  buildTrack(104, "Neon Dreams"),
  buildTrack(105, "Stellar"),
  buildTrack(106, "Ether"),
];

const sampleAlbum = buildAlbum(500, "Greatest Hits");

const buildSavedPlayingState = (
  overrides: Partial<Record<string, unknown>> = {},
) => ({
  gameState: "playing",
  searchQuery: "",
  selectedArtist: null,
  candidateAlbums: [],
  currentAlbum: { album: sampleAlbum, tracks: sampleTracks },
  foundTrackIds: [],
  timeRemaining: 200,
  validatedAnswers: [],
  sessionId: "session-saved",
  ...overrides,
});

describe("useTracklistGame", () => {
  const mockShow = jest.fn();
  const mockTriggerError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseLocalSearchParams.mockReturnValue({ gameId: "1" });
    mockUseAuthStore.mockImplementation(
      (selector: (state: unknown) => unknown) =>
        selector({ user: { id: "user-1" } }),
    );
    mockUseSettingsStore.mockReturnValue({ errorAnimationsEnabled: false });
    mockUseToast.mockReturnValue({ show: mockShow });
    mockUseErrorFeedback.mockReturnValue({
      shakeAnimation: { value: 0 } as unknown as ReturnType<
        typeof useErrorFeedback
      >["shakeAnimation"],
      borderOpacity: { value: 0 } as unknown as ReturnType<
        typeof useErrorFeedback
      >["borderOpacity"],
      errorMessage: null,
      triggerError: mockTriggerError,
    });

    mockDeezerAPI.getTopArtists.mockResolvedValue({ data: [] } as never);
    mockDeezerAPI.getArtistAlbums.mockResolvedValue({
      data: [sampleAlbum],
    } as never);
    mockDeezerAPI.getAlbumTracks.mockResolvedValue({
      data: sampleTracks,
    } as never);
    mockGetMyActiveSession.mockResolvedValue(null as never);
    mockCreateGameSession.mockResolvedValue({ id: "session-new" } as never);
    mockUpdateGameSession.mockResolvedValue(undefined as never);
    mockSaveGameState.mockResolvedValue(undefined);
    mockDeleteGameState.mockResolvedValue(undefined);
    mockGetGameState.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("resumes a saved playing state and ticks the timer down", async () => {
    mockUseLocalSearchParams.mockReturnValue({ gameId: "1", resume: "true" });
    mockGetGameState.mockResolvedValue(buildSavedPlayingState());

    const { result } = renderHook(() => useTracklistGame());

    await waitFor(() => {
      expect(result.current.gameState).toBe("playing");
      expect(result.current.timeRemaining).toBe(200);
    });

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.timeRemaining).toBe(199);
  });

  it("auto-submits when the timer reaches zero", async () => {
    mockUseLocalSearchParams.mockReturnValue({ gameId: "1", resume: "true" });
    mockGetGameState.mockResolvedValue(
      buildSavedPlayingState({ timeRemaining: 2 }),
    );

    const { result } = renderHook(() => useTracklistGame());

    await waitFor(() => expect(result.current.gameState).toBe("playing"));

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => expect(result.current.gameState).toBe("result"));
    expect(mockUpdateGameSession).toHaveBeenCalledWith(
      "session-saved",
      expect.objectContaining({ status: "completed" }),
    );
  });

  it("handleSubmitAnswer marks a correct fuzzy match as found", async () => {
    mockUseLocalSearchParams.mockReturnValue({ gameId: "1", resume: "true" });
    mockGetGameState.mockResolvedValue(buildSavedPlayingState());

    const { result } = renderHook(() => useTracklistGame());
    await waitFor(() => expect(result.current.gameState).toBe("playing"));

    act(() => {
      result.current.setCurrentInput("Sunset Boulevard");
    });
    act(() => {
      result.current.handleSubmitAnswer();
    });

    expect(result.current.foundTrackIds.has(101)).toBe(true);
    expect(result.current.answerFeedback?.type).toBe("correct");
    expect(result.current.currentInput).toBe("");
    expect(mockTriggerError).not.toHaveBeenCalled();
  });

  it("handleSubmitAnswer triggers error feedback on a wrong answer", async () => {
    mockUseLocalSearchParams.mockReturnValue({ gameId: "1", resume: "true" });
    mockGetGameState.mockResolvedValue(buildSavedPlayingState());

    const { result } = renderHook(() => useTracklistGame());
    await waitFor(() => expect(result.current.gameState).toBe("playing"));

    act(() => {
      result.current.setCurrentInput("Totally Unrelated Title");
    });
    act(() => {
      result.current.handleSubmitAnswer();
    });

    expect(result.current.answerFeedback?.type).toBe("wrong");
    expect(mockTriggerError).toHaveBeenCalledTimes(1);
    expect(result.current.foundTrackIds.size).toBe(0);
  });

  it("resetGame clears state and deletes saved storage", async () => {
    mockUseLocalSearchParams.mockReturnValue({ gameId: "1", resume: "true" });
    mockGetGameState.mockResolvedValue(
      buildSavedPlayingState({ foundTrackIds: [101, 102], timeRemaining: 120 }),
    );

    const { result } = renderHook(() => useTracklistGame());
    await waitFor(() => expect(result.current.gameState).toBe("playing"));

    mockDeleteGameState.mockClear();

    act(() => {
      result.current.resetGame();
    });

    expect(result.current.gameState).toBe("artistSearch");
    expect(result.current.currentAlbum).toBeNull();
    expect(result.current.foundTrackIds.size).toBe(0);
    expect(result.current.timeRemaining).toBe(300);
    expect(mockDeleteGameState).toHaveBeenCalledWith("1");
  });

  it("startGameWithAlbum creates a session and transitions to playing", async () => {
    const { result } = renderHook(() => useTracklistGame());

    await waitFor(() => expect(result.current.gameState).toBe("artistSearch"));

    await act(async () => {
      await result.current.startGameWithAlbum(sampleAlbum);
    });

    expect(mockCreateGameSession).toHaveBeenCalledWith(
      expect.objectContaining({ gameId: 1, status: "active" }),
    );
    expect(result.current.sessionId).toBe("session-new");
    expect(result.current.gameState).toBe("playing");
    expect(result.current.currentAlbum?.album.id).toBe(500);
    expect(result.current.timeRemaining).toBe(300);
  });
});
