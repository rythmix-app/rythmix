import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useParkeurGame } from "../useParkeurGame";
import { useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import {
  getMyActiveSession,
  updateGameSession,
} from "@/services/gameSessionService";
import {
  CuratedPlaylist,
  getCuratedPlaylists,
} from "@/services/curatedPlaylistService";
import { startParkeurSession } from "@/services/parkeurService";
import {
  deleteGameState,
  getGameState,
  saveGameState,
} from "@/services/gameStorageService";
import type { ParkeurRound } from "@/types/gameSession";

jest.mock("@/services/gameSessionService");
jest.mock("@/services/curatedPlaylistService");
jest.mock("@/services/parkeurService");
jest.mock("@/services/gameStorageService");
jest.mock("@/stores/authStore");
jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  router: { back: jest.fn(), push: jest.fn() },
}));

const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<
  typeof useLocalSearchParams
>;
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;
const mockGetCuratedPlaylists = getCuratedPlaylists as jest.MockedFunction<
  typeof getCuratedPlaylists
>;
const mockStartParkeurSession = startParkeurSession as jest.MockedFunction<
  typeof startParkeurSession
>;
const mockUpdateGameSession = updateGameSession as jest.MockedFunction<
  typeof updateGameSession
>;
const mockGetMyActiveSession = getMyActiveSession as jest.MockedFunction<
  typeof getMyActiveSession
>;
const mockGetGameState = getGameState as jest.MockedFunction<
  typeof getGameState
>;
const mockSaveGameState = saveGameState as jest.MockedFunction<
  typeof saveGameState
>;
const mockDeleteGameState = deleteGameState as jest.MockedFunction<
  typeof deleteGameState
>;

const buildPlaylist = (id: number, name: string): CuratedPlaylist => ({
  id,
  deezerPlaylistId: id * 100,
  name,
  genreLabel: "Rap FR",
  coverUrl: null,
  trackCount: 50,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const buildRound = (id: number, answer: string): ParkeurRound => ({
  trackId: id,
  artist: `Artist ${id}`,
  title: `Track ${id}`,
  coverUrl: null,
  lines: [`Line ${id}.1`, `Line ${id}.2`],
  answerLine: answer,
});

describe("useParkeurGame", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseLocalSearchParams.mockReturnValue({ gameId: "42" });
    mockUseAuthStore.mockImplementation((selector: any) =>
      selector({ user: { id: "user-1", email: "u@u.fr" } }),
    );
    mockGetCuratedPlaylists.mockResolvedValue([buildPlaylist(1, "Rap FR")]);
    mockUpdateGameSession.mockResolvedValue({} as any);
    mockGetMyActiveSession.mockResolvedValue(null);
    mockGetGameState.mockResolvedValue(null);
    mockSaveGameState.mockResolvedValue();
    mockDeleteGameState.mockResolvedValue();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("loads playlists on mount", async () => {
    const { result } = renderHook(() => useParkeurGame());
    await waitFor(() => {
      expect(result.current.loadingPlaylists).toBe(false);
    });
    expect(result.current.playlists).toHaveLength(1);
    expect(result.current.gameState).toBe("selection");
  });

  it("starts a game and exposes the first round", async () => {
    mockStartParkeurSession.mockResolvedValue({
      session: { id: "sess-1" } as any,
      rounds: [buildRound(1, "Premier"), buildRound(2, "Deuxième")],
    });

    const { result } = renderHook(() => useParkeurGame());
    await waitFor(() => expect(result.current.loadingPlaylists).toBe(false));

    await act(async () => {
      await result.current.startWithPlaylist(buildPlaylist(1, "Rap FR"));
    });

    expect(result.current.gameState).toBe("playing");
    expect(result.current.rounds).toHaveLength(2);
    expect(result.current.currentRound?.answerLine).toBe("Premier");
  });

  it("scores a correct answer (case/accent tolerant) and advances on goToNextRound", async () => {
    mockStartParkeurSession.mockResolvedValue({
      session: { id: "sess-2" } as any,
      rounds: [buildRound(1, "Téléphone"), buildRound(2, "Suivante")],
    });

    const { result } = renderHook(() => useParkeurGame());
    await waitFor(() => expect(result.current.loadingPlaylists).toBe(false));
    await act(async () => {
      await result.current.startWithPlaylist(buildPlaylist(1, "Pop"));
    });

    act(() => {
      result.current.submitAnswer("telephone");
    });

    expect(result.current.gameState).toBe("reveal");
    expect(result.current.score).toBe(1);
    expect(result.current.lastAnswer?.correct).toBe(true);
    expect(mockUpdateGameSession).toHaveBeenCalledWith(
      "sess-2",
      expect.objectContaining({
        gameData: expect.objectContaining({ score: 1 }),
      }),
    );

    // No auto-advance: still on reveal until the player taps "Next".
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.gameState).toBe("reveal");

    act(() => result.current.goToNextRound());

    expect(result.current.gameState).toBe("playing");
    expect(result.current.currentRoundIndex).toBe(1);
  });

  it("skipRound records an empty incorrect answer and stays in reveal", async () => {
    mockStartParkeurSession.mockResolvedValue({
      session: { id: "sess-skip" } as any,
      rounds: [buildRound(1, "Anything"), buildRound(2, "Suivante")],
    });

    const { result } = renderHook(() => useParkeurGame());
    await waitFor(() => expect(result.current.loadingPlaylists).toBe(false));
    await act(async () => {
      await result.current.startWithPlaylist(buildPlaylist(1, "Pop"));
    });

    act(() => result.current.skipRound());

    expect(result.current.gameState).toBe("reveal");
    expect(result.current.score).toBe(0);
    expect(result.current.lastAnswer?.correct).toBe(false);
    expect(result.current.lastAnswer?.userInput).toBe("");
  });

  it("ignores skipRound and goToNextRound when called in the wrong state", async () => {
    mockStartParkeurSession.mockResolvedValue({
      session: { id: "sess-noop" } as any,
      rounds: [buildRound(1, "Anything")],
    });

    const { result } = renderHook(() => useParkeurGame());
    await waitFor(() => expect(result.current.loadingPlaylists).toBe(false));
    // skipRound from selection state → no-op
    act(() => result.current.skipRound());
    expect(result.current.gameState).toBe("selection");
    // goToNextRound from selection state → no-op
    act(() => result.current.goToNextRound());
    expect(result.current.gameState).toBe("selection");
  });

  it("scores an incorrect answer as 0", async () => {
    mockStartParkeurSession.mockResolvedValue({
      session: { id: "sess-3" } as any,
      rounds: [buildRound(1, "Bonjour"), buildRound(2, "Suivante")],
    });

    const { result } = renderHook(() => useParkeurGame());
    await waitFor(() => expect(result.current.loadingPlaylists).toBe(false));
    await act(async () => {
      await result.current.startWithPlaylist(buildPlaylist(1, "Pop"));
    });

    act(() => {
      result.current.submitAnswer("au revoir");
    });

    expect(result.current.score).toBe(0);
    expect(result.current.lastAnswer?.correct).toBe(false);
  });

  it("transitions to result on goToNextRound after the last round", async () => {
    mockStartParkeurSession.mockResolvedValue({
      session: { id: "sess-end" } as any,
      rounds: [buildRound(1, "Final")],
    });

    const { result } = renderHook(() => useParkeurGame());
    await waitFor(() => expect(result.current.loadingPlaylists).toBe(false));
    await act(async () => {
      await result.current.startWithPlaylist(buildPlaylist(1, "Pop"));
    });

    act(() => {
      result.current.submitAnswer("Final");
    });
    act(() => result.current.goToNextRound());

    expect(result.current.gameState).toBe("result");
    expect(result.current.score).toBe(1);
    expect(mockUpdateGameSession).toHaveBeenLastCalledWith(
      "sess-end",
      expect.objectContaining({
        status: "completed",
        gameData: expect.objectContaining({ score: 1 }),
      }),
    );
  });

  it("surfaces an error message when startParkeurSession fails", async () => {
    mockStartParkeurSession.mockRejectedValue(new Error("Boom"));
    const { result } = renderHook(() => useParkeurGame());
    await waitFor(() => expect(result.current.loadingPlaylists).toBe(false));

    await act(async () => {
      await result.current.startWithPlaylist(buildPlaylist(1, "Pop"));
    });

    expect(result.current.gameState).toBe("selection");
    expect(result.current.errorMessage).toBe("Boom");
  });

  it("resetGame clears state back to selection", async () => {
    mockStartParkeurSession.mockResolvedValue({
      session: { id: "sess-r" } as any,
      rounds: [buildRound(1, "X")],
    });
    const { result } = renderHook(() => useParkeurGame());
    await waitFor(() => expect(result.current.loadingPlaylists).toBe(false));
    await act(async () => {
      await result.current.startWithPlaylist(buildPlaylist(1, "Pop"));
    });
    act(() => result.current.resetGame());
    expect(result.current.gameState).toBe("selection");
    expect(result.current.rounds).toHaveLength(0);
    expect(mockDeleteGameState).toHaveBeenCalledWith("42");
  });

  it("resumes from saved AsyncStorage state when resume=true", async () => {
    mockUseLocalSearchParams.mockReturnValue({ gameId: "42", resume: "true" });
    const savedRounds = [buildRound(11, "Suite"), buildRound(12, "Encore")];
    mockGetGameState.mockResolvedValue({
      selectedPlaylist: buildPlaylist(7, "Saved"),
      rounds: savedRounds,
      currentRoundIndex: 1,
      score: 1,
      answers: [
        {
          correct: true,
          durationMs: 1234,
          userInput: "Suite",
          expected: "Suite",
        },
      ],
      sessionId: "sess-saved",
      startedAt: Date.now() - 60_000,
    } as any);

    const { result } = renderHook(() => useParkeurGame());

    await waitFor(() => expect(result.current.gameState).toBe("playing"));
    expect(result.current.rounds).toHaveLength(2);
    expect(result.current.currentRoundIndex).toBe(1);
    expect(result.current.score).toBe(1);
    expect(result.current.currentRound?.answerLine).toBe("Encore");
    expect(mockGetGameState).toHaveBeenCalledWith("42");
    expect(mockDeleteGameState).not.toHaveBeenCalled();
  });

  it("hydrates from server active session when resume=true and no local save exists", async () => {
    mockUseLocalSearchParams.mockReturnValue({ gameId: "42", resume: "true" });
    mockGetGameState.mockResolvedValue(null);
    mockGetMyActiveSession.mockResolvedValue({
      id: "sess-server",
      gameData: {
        playlistId: 9,
        playlistName: "Server Pop",
        rounds: [buildRound(20, "Server line"), buildRound(21, "Other")],
        currentRound: 1,
        score: 1,
        answers: [
          {
            correct: true,
            durationMs: 800,
            userInput: "Server line",
            expected: "Server line",
          },
        ],
        startedAt: "2026-05-04T10:00:00.000Z",
      },
    } as any);

    const { result } = renderHook(() => useParkeurGame());

    await waitFor(() => expect(result.current.gameState).toBe("playing"));
    expect(mockGetMyActiveSession).toHaveBeenCalledWith(42);
    expect(result.current.rounds).toHaveLength(2);
    expect(result.current.currentRoundIndex).toBe(1);
    expect(result.current.score).toBe(1);
    expect(result.current.currentRound?.answerLine).toBe("Other");
  });

  it("clears any stale saved state when entering without resume", async () => {
    mockUseLocalSearchParams.mockReturnValue({ gameId: "42" });
    renderHook(() => useParkeurGame());
    await waitFor(() => expect(mockDeleteGameState).toHaveBeenCalledWith("42"));
  });

  it("persists saved state on startGame and clears it on completion", async () => {
    mockStartParkeurSession.mockResolvedValue({
      session: { id: "sess-final" } as any,
      rounds: [buildRound(1, "Final")],
    });
    const { result } = renderHook(() => useParkeurGame());
    await waitFor(() => expect(result.current.loadingPlaylists).toBe(false));
    await act(async () => {
      await result.current.startWithPlaylist(buildPlaylist(1, "Pop"));
    });
    expect(mockSaveGameState).toHaveBeenCalledWith(
      "42",
      expect.objectContaining({
        sessionId: "sess-final",
        currentRoundIndex: 0,
      }),
    );

    act(() => {
      result.current.submitAnswer("Final");
    });
    act(() => result.current.goToNextRound());

    expect(result.current.gameState).toBe("result");
    expect(mockDeleteGameState).toHaveBeenCalledWith("42");
  });
});
