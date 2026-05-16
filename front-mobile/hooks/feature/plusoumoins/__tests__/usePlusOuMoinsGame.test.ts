import { renderHook, waitFor, act } from "@testing-library/react-native";
import { usePlusOuMoinsGame, TargetData } from "../usePlusOuMoinsGame";
import { deezerAPI } from "@/services/deezer-api";
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
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@/services/deezer-api");
jest.mock("@/services/gameSessionService");
jest.mock("@/services/gameStorageService");
jest.mock("@/stores/authStore");
jest.mock("@react-native-async-storage/async-storage");
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
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const sampleArtists = [
  { id: 1, name: "Artist 1", nb_fan: 1000, picture_xl: "pic1.jpg" },
  { id: 2, name: "Artist 2", nb_fan: 2000, picture_xl: "pic2.jpg" },
  { id: 3, name: "Artist 3", nb_fan: 3000, picture_xl: "pic3.jpg" },
];

describe("usePlusOuMoinsGame", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseLocalSearchParams.mockReturnValue({ gameId: "plus-1" });
    mockUseAuthStore.mockImplementation(
      (selector: (state: unknown) => unknown) =>
        selector({ user: { id: "user-1" } }),
    );

    mockDeezerAPI.getTopArtists.mockResolvedValue({
      data: sampleArtists,
    } as never);
    mockDeezerAPI.getArtist.mockImplementation(async (id: number) => {
      const a = sampleArtists.find((x) => x.id === id);
      return a as any;
    });

    mockCreateGameSession.mockResolvedValue({ id: "session-pm" } as never);
    mockUpdateGameSession.mockResolvedValue(undefined as never);
    mockSaveGameState.mockResolvedValue(undefined);
    mockDeleteGameState.mockResolvedValue(undefined);
    mockGetGameState.mockResolvedValue(null);
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts in selection state", () => {
    const { result } = renderHook(() => usePlusOuMoinsGame());
    expect(result.current.gameState).toBe("selection");
    expect(result.current.mode).toBeNull();
  });

  it("loadInitialData transitions to playing state after fetching data", async () => {
    const { result } = renderHook(() => usePlusOuMoinsGame());

    await act(async () => {
      await result.current.loadInitialData("artist");
    });

    expect(mockDeezerAPI.getTopArtists).toHaveBeenCalledWith(50);
    expect(mockCreateGameSession).toHaveBeenCalled();
    expect(result.current.gameState).toBe("playing");
    expect(result.current.targetA).toBeDefined();
    expect(result.current.targetB).toBeDefined();
  });

  it("handleGuess updates streak on correct answer", async () => {
    const { result } = renderHook(() => usePlusOuMoinsGame());

    await act(async () => {
      await result.current.loadInitialData("artist");
    });

    const tA = result.current.targetA!;
    const tB = result.current.targetB!;
    const correctGuess = tB.score >= tA.score ? "higher" : "lower";

    await act(async () => {
      await result.current.handleGuess(correctGuess);
    });

    expect(result.current.gameState).toBe("reveal");
    expect(result.current.isCorrect).toBe(true);
    expect(result.current.streak).toBe(1);

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(result.current.gameState).toBe("playing");
    expect(result.current.targetA).toEqual(tB);
  });

  it("handleGuess transitions to wrong state on incorrect answer", async () => {
    const { result } = renderHook(() => usePlusOuMoinsGame());

    await act(async () => {
      await result.current.loadInitialData("artist");
    });

    const tA = result.current.targetA!;
    const tB = result.current.targetB!;
    const wrongGuess = tB.score >= tA.score ? "lower" : "higher";

    await act(async () => {
      await result.current.handleGuess(wrongGuess);
    });

    expect(result.current.gameState).toBe("reveal");
    expect(result.current.isCorrect).toBe(false);
    expect(result.current.streak).toBe(0);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.gameState).toBe("result");
  });

  it("resetGame clears the state", async () => {
    const { result } = renderHook(() => usePlusOuMoinsGame());

    await act(async () => {
      await result.current.loadInitialData("artist");
    });

    act(() => {
      result.current.resetGame();
    });

    expect(result.current.gameState).toBe("selection");
    expect(result.current.mode).toBeNull();
    expect(result.current.streak).toBe(0);
  });

  it("resumes a saved state", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      gameId: "plus-1",
      resume: "true",
    });
    const savedState = {
      mode: "artist",
      gameState: "playing",
      targetA: { id: 1, name: "A", score: 100, image: "img1" },
      targetB: { id: 2, name: "B", score: 200, image: "img2" },
      streak: 5,
      rounds: [],
      sessionId: "saved-sess",
      targetPool: [],
      currentTargetIndex: 1,
      usedIds: [1, 2],
    };
    mockGetGameState.mockResolvedValue(savedState);

    const { result } = renderHook(() => usePlusOuMoinsGame());

    await waitFor(() => {
      expect(result.current.gameState).toBe("playing");
      expect(result.current.streak).toBe(5);
      expect(result.current.sessionId).toBe("saved-sess");
    });
  });
});
