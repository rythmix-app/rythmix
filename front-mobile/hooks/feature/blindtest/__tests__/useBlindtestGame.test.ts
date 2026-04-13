import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useBlindtestGame, getFeaturing } from "../useBlindtestGame";
import { deezerAPI, DeezerGenre, DeezerTrack } from "@/services/deezer-api";
import { useLocalSearchParams } from "expo-router";
import {
  createGameSession,
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
import { useAudioPlayer } from "@/hooks/useAudioPlayer";

jest.mock("@/services/deezer-api");
jest.mock("@/services/cache-manager");
jest.mock("@/services/gameSessionService");
jest.mock("@/services/gameStorageService");
jest.mock("@/stores/authStore");
jest.mock("@/stores/settingsStore");
jest.mock("@/components/Toast");
jest.mock("@/hooks/useErrorFeedback");
jest.mock("@/hooks/useGenres");
jest.mock("@/hooks/useAudioPlayer");
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
const mockUseAudioPlayer = useAudioPlayer as jest.MockedFunction<
  typeof useAudioPlayer
>;

const buildTrack = (
  id: number,
  title: string,
  artistName: string,
  contributors?: { id: number; name: string; role: string; type: string }[],
): DeezerTrack =>
  ({
    id,
    title,
    title_short: title,
    title_version: "",
    link: "",
    duration: 30,
    rank: 0,
    explicit_lyrics: false,
    explicit_content_lyrics: 0,
    explicit_content_cover: 0,
    preview: "https://preview.example.com/track.mp3",
    md5_image: "",
    artist: { id: id * 10, name: artistName },
    album: {
      id: id * 100,
      title: `Album ${id}`,
      cover_xl: `cover_${id}.jpg`,
      cover_big: `cover_big_${id}.jpg`,
    },
    contributors,
    type: "track",
  }) as unknown as DeezerTrack;

const sampleGenre: DeezerGenre = {
  id: 132,
  name: "Pop",
  picture: "",
  picture_small: "",
  picture_medium: "",
  picture_big: "",
  picture_xl: "",
} as unknown as DeezerGenre;

const sampleTracks = [
  buildTrack(1, "Bohemian Rhapsody", "Queen"),
  buildTrack(2, "Imagine", "John Lennon"),
  buildTrack(3, "Billie Jean", "Michael Jackson"),
  buildTrack(4, "Smells Like Teen Spirit", "Nirvana"),
  buildTrack(5, "Hotel California", "Eagles"),
];

describe("getFeaturing", () => {
  it("returns featuring names from contributors", () => {
    const track = buildTrack(1, "Song", "Main Artist", [
      { id: 10, name: "Main Artist", role: "Main", type: "artist" },
      { id: 20, name: "Feat Artist", role: "Main", type: "artist" },
    ]);
    expect(getFeaturing(track)).toEqual(["Feat Artist"]);
  });

  it("returns empty array when no contributors", () => {
    const track = buildTrack(1, "Song", "Solo");
    expect(getFeaturing(track)).toEqual([]);
  });

  it("returns empty array when only main artist", () => {
    const track = buildTrack(1, "Song", "Solo", [
      { id: 10, name: "Solo", role: "Main", type: "artist" },
    ]);
    expect(getFeaturing(track)).toEqual([]);
  });
});

describe("useBlindtestGame", () => {
  const mockShow = jest.fn();
  const mockTriggerError = jest.fn();
  const mockAudioPlay = jest.fn().mockResolvedValue(undefined);
  const mockAudioStop = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseLocalSearchParams.mockReturnValue({ gameId: "556" });
    mockUseAuthStore.mockImplementation(
      (selector: (state: unknown) => unknown) =>
        selector({ user: { id: "user-1" } }),
    );
    mockUseSettingsStore.mockReturnValue({ errorAnimationsEnabled: false });
    mockUseToast.mockReturnValue({ show: mockShow });
    mockUseErrorFeedback.mockReturnValue({
      shakeAnimation: { value: 0 } as never,
      borderOpacity: { value: 0 } as never,
      errorMessage: null,
      triggerError: mockTriggerError,
    });
    mockUseGenres.mockReturnValue({
      genres: [sampleGenre],
      loadingGenres: false,
      reloadGenres: jest.fn(),
    });
    mockUseAudioPlayer.mockReturnValue({
      play: mockAudioPlay,
      stop: mockAudioStop,
      pause: jest.fn(),
      resume: jest.fn(),
      seek: jest.fn(),
      setVolume: jest.fn(),
      isPlaying: true,
      duration: 30,
      position: 0,
      currentTrack: null,
      volume: 1,
      isLoading: false,
      error: null,
    });

    mockDeezerAPI.getGenreTracks.mockResolvedValue({
      data: sampleTracks,
    } as never);
    // getTrack returns the same track (enriched with contributors in real API)
    mockDeezerAPI.getTrack.mockImplementation(
      async (id: number) =>
        sampleTracks.find((t) => t.id === id) as DeezerTrack,
    );
    mockCreateGameSession.mockResolvedValue({ id: "session-bt" } as never);
    mockUpdateGameSession.mockResolvedValue(undefined as never);
    mockSaveGameState.mockResolvedValue(undefined);
    mockDeleteGameState.mockResolvedValue(undefined);
    mockGetGameState.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts in genreSelection state", () => {
    const { result } = renderHook(() => useBlindtestGame());
    expect(result.current.gameState).toBe("genreSelection");
    expect(result.current.currentTrack).toBeNull();
    expect(result.current.totalRounds).toBe(0);
  });

  it("startGame transitions to ready state after fetching tracks", async () => {
    const { result } = renderHook(() => useBlindtestGame());

    await act(async () => {
      await result.current.startGame(sampleGenre);
    });

    expect(mockDeezerAPI.getGenreTracks).toHaveBeenCalledWith(132, 50);
    expect(mockDeezerAPI.getTrack).toHaveBeenCalledTimes(5);
    expect(mockCreateGameSession).toHaveBeenCalledWith(
      expect.objectContaining({ gameId: 556, status: "active" }),
    );
    expect(result.current.sessionId).toBe("session-bt");
    expect(result.current.gameState).toBe("ready");
    expect(result.current.totalRounds).toBe(5);
  });

  it("beginPlaying transitions from ready to playing", async () => {
    const { result } = renderHook(() => useBlindtestGame());

    await act(async () => {
      await result.current.startGame(sampleGenre);
    });

    expect(result.current.gameState).toBe("ready");

    act(() => {
      result.current.beginPlaying();
    });

    expect(result.current.gameState).toBe("playing");
    expect(result.current.timeRemaining).toBe(30);
    expect(mockAudioPlay).toHaveBeenCalled();
  });

  it("shows error when no tracks have valid previews", async () => {
    const noPreviewTracks = sampleTracks.map((t) => ({
      ...t,
      preview: "",
    }));
    mockDeezerAPI.getGenreTracks.mockResolvedValue({
      data: noPreviewTracks,
    } as never);

    const { result } = renderHook(() => useBlindtestGame());

    await act(async () => {
      await result.current.startGame(sampleGenre);
    });

    expect(result.current.gameState).toBe("genreSelection");
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("submitAnswer with correct artist sets artistFound", async () => {
    const { result } = renderHook(() => useBlindtestGame());

    await act(async () => {
      await result.current.startGame(sampleGenre);
    });
    act(() => {
      result.current.beginPlaying();
    });

    const artistName = result.current.currentTrack!.artist.name;

    act(() => {
      result.current.setAnswerInput(artistName);
    });
    act(() => {
      result.current.submitAnswer();
    });

    expect(result.current.artistFound).toBe(true);
    expect(result.current.answerInput).toBe("");
  });

  it("submitAnswer with wrong answer clears input and triggers error", async () => {
    const { result } = renderHook(() => useBlindtestGame());

    await act(async () => {
      await result.current.startGame(sampleGenre);
    });
    act(() => {
      result.current.beginPlaying();
    });

    act(() => {
      result.current.setAnswerInput("Completely Wrong Answer");
    });
    act(() => {
      result.current.submitAnswer();
    });

    expect(result.current.artistFound).toBe(false);
    expect(result.current.titleFound).toBe(false);
    expect(result.current.answerInput).toBe("");
    expect(mockTriggerError).toHaveBeenCalledWith("Mauvaise réponse !");
  });

  it("resetGame clears state and deletes saved storage", async () => {
    const { result } = renderHook(() => useBlindtestGame());

    await act(async () => {
      await result.current.startGame(sampleGenre);
    });

    mockDeleteGameState.mockClear();

    act(() => {
      result.current.resetGame();
    });

    expect(result.current.gameState).toBe("genreSelection");
    expect(result.current.currentTrack).toBeNull();
    expect(result.current.sessionId).toBeNull();
    expect(result.current.completedRounds).toEqual([]);
    expect(mockDeleteGameState).toHaveBeenCalledWith("556");
    expect(mockAudioStop).toHaveBeenCalled();
  });

  it("resumes a saved playing state", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      gameId: "556",
      resume: "true",
    });
    mockGetGameState.mockResolvedValue({
      gameState: "playing",
      selectedGenre: sampleGenre,
      tracks: sampleTracks,
      currentRoundIndex: 2,
      timeRemaining: 20,
      artistFound: true,
      foundFeaturings: [],
      titleFound: false,
      roundStartTime: Date.now(),
      completedRounds: [],
      sessionId: "session-saved",
    });

    const { result } = renderHook(() => useBlindtestGame());

    await waitFor(() => {
      expect(result.current.gameState).toBe("playing");
      expect(result.current.currentRoundIndex).toBe(2);
      expect(result.current.timeRemaining).toBe(20);
      expect(result.current.artistFound).toBe(true);
      expect(result.current.sessionId).toBe("session-saved");
    });

    expect(mockAudioPlay).toHaveBeenCalled();
  });

  it("getRoundMaxScore returns 3 for tracks with featuring, 2 otherwise", () => {
    const { result } = renderHook(() => useBlindtestGame());

    const regularTrack = buildTrack(1, "Simple Song", "Artist", [
      { id: 10, name: "Artist", role: "Main", type: "artist" },
    ]);
    const featTrack = buildTrack(2, "Song", "Artist", [
      { id: 20, name: "Artist", role: "Main", type: "artist" },
      { id: 30, name: "Other", role: "Main", type: "artist" },
    ]);

    expect(result.current.getRoundMaxScore(regularTrack)).toBe(2);
    expect(result.current.getRoundMaxScore(featTrack)).toBe(3);
  });
});
