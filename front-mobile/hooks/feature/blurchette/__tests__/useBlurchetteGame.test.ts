import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useBlurchetteGame } from "../useBlurchetteGame";
import { deezerAPI, DeezerGenre, DeezerTrack } from "@/services/deezer-api";
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
import { useGenres } from "@/hooks/useGenres";

jest.mock("@/services/deezer-api");
jest.mock("@/services/gameSessionService");
jest.mock("@/services/gameStorageService");
jest.mock("@/stores/authStore");
jest.mock("@/stores/settingsStore");
jest.mock("@/components/Toast");
jest.mock("@/hooks/useErrorFeedback");
jest.mock("@/hooks/useGenres");
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
const mockUseGenres = useGenres as jest.MockedFunction<typeof useGenres>;

const buildTrack = (
  id: number,
  title: string,
  artistName: string,
  albumTitle: string,
): DeezerTrack =>
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
    artist: { id: 1, name: artistName },
    album: { id: 1, title: albumTitle, cover_xl: "cover.jpg" },
    type: "track",
  }) as unknown as DeezerTrack;

const sampleGenre = {
  id: 132,
  name: "Pop",
  picture: "",
  picture_small: "",
  picture_medium: "",
  picture_big: "",
  picture_xl: "",
  type: "genre",
} as unknown as DeezerGenre;

const albumTrack = buildTrack(
  42,
  "Song Title",
  "Famous Artist",
  "Greatest Album",
);

const buildSavedPlayingState = (
  overrides: Partial<Record<string, unknown>> = {},
) => ({
  gameState: "playing",
  selectedGenre: sampleGenre,
  currentTrack: { track: albumTrack, isAlbum: true },
  blurLevel: 2,
  currentAttempts: [],
  sessionId: "session-saved",
  foundCorrect: false,
  hasAnswered: false,
  ...overrides,
});

describe("useBlurchetteGame", () => {
  const mockShow = jest.fn();
  const mockTriggerError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

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
    mockUseGenres.mockReturnValue({
      genres: [sampleGenre],
      loadingGenres: false,
      reloadGenres: jest.fn(),
    });

    mockDeezerAPI.getGenreTracks.mockResolvedValue({
      data: [albumTrack],
    } as never);
    mockGetMyActiveSession.mockResolvedValue(null as never);
    mockCreateGameSession.mockResolvedValue({ id: "session-new" } as never);
    mockUpdateGameSession.mockResolvedValue(undefined as never);
    mockSaveGameState.mockResolvedValue(undefined);
    mockDeleteGameState.mockResolvedValue(undefined);
    mockGetGameState.mockResolvedValue(null);
  });

  it("starts in genreSelection with blurLevel 1", () => {
    const { result } = renderHook(() => useBlurchetteGame());

    expect(result.current.gameState).toBe("genreSelection");
    expect(result.current.blurLevel).toBe(1);
    expect(result.current.currentTrack).toBeNull();
  });

  it("startGame creates a session and transitions to playing", async () => {
    const { result } = renderHook(() => useBlurchetteGame());

    await act(async () => {
      await result.current.startGame(sampleGenre);
    });

    expect(mockCreateGameSession).toHaveBeenCalledWith(
      expect.objectContaining({ gameId: 1, status: "active" }),
    );
    expect(result.current.sessionId).toBe("session-new");
    expect(result.current.gameState).toBe("playing");
    expect(result.current.currentTrack?.track.id).toBe(42);
    expect(result.current.currentTrack?.isAlbum).toBe(true);
    expect(result.current.blurLevel).toBe(1);
  });

  it("submitAnswer transitions to result on a correct artist fuzzy match", async () => {
    mockUseLocalSearchParams.mockReturnValue({ gameId: "1", resume: "true" });
    mockGetGameState.mockResolvedValue(buildSavedPlayingState());

    const { result } = renderHook(() => useBlurchetteGame());
    await waitFor(() => expect(result.current.gameState).toBe("playing"));

    act(() => {
      result.current.setAnswer("Famous Artist");
    });
    await act(async () => {
      await result.current.submitAnswer();
    });

    expect(result.current.gameState).toBe("result");
    expect(result.current.foundCorrect).toBe(true);
    expect(mockUpdateGameSession).toHaveBeenCalledWith(
      "session-saved",
      expect.objectContaining({ status: "completed" }),
    );
  });

  it("submitAnswer on a wrong answer before level 5 increases the blur and triggers error feedback", async () => {
    mockUseLocalSearchParams.mockReturnValue({ gameId: "1", resume: "true" });
    mockGetGameState.mockResolvedValue(
      buildSavedPlayingState({ blurLevel: 2 }),
    );

    const { result } = renderHook(() => useBlurchetteGame());
    await waitFor(() => expect(result.current.gameState).toBe("playing"));

    act(() => {
      result.current.setAnswer("Totally Unrelated Title");
    });
    await act(async () => {
      await result.current.submitAnswer();
    });

    expect(result.current.gameState).toBe("playing");
    expect(result.current.blurLevel).toBe(3);
    expect(mockTriggerError).toHaveBeenCalledTimes(1);
    expect(result.current.answer).toBe("");
  });

  it("submitAnswer on a wrong answer at level 5 transitions to result foundCorrect=false", async () => {
    mockUseLocalSearchParams.mockReturnValue({ gameId: "1", resume: "true" });
    mockGetGameState.mockResolvedValue(
      buildSavedPlayingState({ blurLevel: 5 }),
    );

    const { result } = renderHook(() => useBlurchetteGame());
    await waitFor(() => expect(result.current.gameState).toBe("playing"));

    act(() => {
      result.current.setAnswer("Still Wrong");
    });
    await act(async () => {
      await result.current.submitAnswer();
    });

    expect(result.current.gameState).toBe("result");
    expect(result.current.foundCorrect).toBe(false);
    expect(mockUpdateGameSession).toHaveBeenCalledWith(
      "session-saved",
      expect.objectContaining({ status: "completed" }),
    );
  });

  it("resumes a saved playing state", async () => {
    mockUseLocalSearchParams.mockReturnValue({ gameId: "1", resume: "true" });
    mockGetGameState.mockResolvedValue(
      buildSavedPlayingState({ blurLevel: 3 }),
    );

    const { result } = renderHook(() => useBlurchetteGame());

    await waitFor(() => {
      expect(result.current.gameState).toBe("playing");
      expect(result.current.blurLevel).toBe(3);
      expect(result.current.currentTrack?.track.id).toBe(42);
      expect(result.current.sessionId).toBe("session-saved");
    });
  });

  it("persists updated blur level to local storage after a wrong answer", async () => {
    mockUseLocalSearchParams.mockReturnValue({ gameId: "1", resume: "true" });
    mockGetGameState.mockResolvedValue(
      buildSavedPlayingState({ blurLevel: 2 }),
    );

    const { result } = renderHook(() => useBlurchetteGame());
    await waitFor(() => expect(result.current.gameState).toBe("playing"));

    mockSaveGameState.mockClear();

    act(() => {
      result.current.setAnswer("Totally Unrelated Title");
    });
    await act(async () => {
      await result.current.submitAnswer();
    });

    await waitFor(() => {
      expect(mockSaveGameState).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({ blurLevel: 3 }),
      );
    });
  });

  it("submitAnswer guards against concurrent double submissions", async () => {
    mockUseLocalSearchParams.mockReturnValue({ gameId: "1", resume: "true" });
    mockGetGameState.mockResolvedValue(buildSavedPlayingState());

    const { result } = renderHook(() => useBlurchetteGame());
    await waitFor(() => expect(result.current.gameState).toBe("playing"));

    let resolveUpdate: (() => void) | undefined;
    mockUpdateGameSession.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = () => resolve();
        }) as never,
    );

    act(() => {
      result.current.setAnswer("Famous Artist");
    });

    let firstCall: Promise<void> | undefined;
    act(() => {
      firstCall = result.current.submitAnswer();
    });

    await act(async () => {
      await result.current.submitAnswer();
    });

    expect(mockUpdateGameSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate?.();
      await firstCall;
    });

    expect(result.current.gameState).toBe("result");
    expect(result.current.foundCorrect).toBe(true);
  });

  it("resetGame clears state and deletes saved storage", async () => {
    mockUseLocalSearchParams.mockReturnValue({ gameId: "1", resume: "true" });
    mockGetGameState.mockResolvedValue(
      buildSavedPlayingState({ blurLevel: 4 }),
    );

    const { result } = renderHook(() => useBlurchetteGame());
    await waitFor(() => expect(result.current.gameState).toBe("playing"));

    mockDeleteGameState.mockClear();

    act(() => {
      result.current.resetGame();
    });

    expect(result.current.gameState).toBe("genreSelection");
    expect(result.current.currentTrack).toBeNull();
    expect(result.current.blurLevel).toBe(1);
    expect(result.current.sessionId).toBeNull();
    expect(mockDeleteGameState).toHaveBeenCalledWith("1");
  });
});
