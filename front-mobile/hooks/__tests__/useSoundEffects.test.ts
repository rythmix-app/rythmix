import { renderHook, act } from "@testing-library/react-native";
import { createAudioPlayer } from "expo-audio";
import { useSoundSettingsStore } from "@/stores/soundSettingsStore";
import { useSoundEffects } from "../useSoundEffects";

jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    seekTo: jest.fn(),
    remove: jest.fn(),
    volume: 1,
  })),
}));

jest.mock("@/stores/soundSettingsStore", () => ({
  useSoundSettingsStore: jest.fn(() => ({
    swipeSoundsEnabled: true,
    gameSoundsEnabled: true,
  })),
}));

const mockCreateAudioPlayer = jest.mocked(createAudioPlayer);
const mockUseSoundSettingsStore = jest.mocked(useSoundSettingsStore);

function makePlayer() {
  return { play: jest.fn(), seekTo: jest.fn(), remove: jest.fn(), volume: 1 };
}

function anyPlayerPlayed() {
  return mockCreateAudioPlayer.mock.results.some(
    (r) =>
      (r.value as ReturnType<typeof makePlayer>).play.mock.calls.length > 0,
  );
}

function noPlayerPlayed() {
  return mockCreateAudioPlayer.mock.results.every(
    (r) =>
      (r.value as ReturnType<typeof makePlayer>).play.mock.calls.length === 0,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateAudioPlayer.mockImplementation(
    () => makePlayer() as unknown as ReturnType<typeof createAudioPlayer>,
  );
  mockUseSoundSettingsStore.mockReturnValue({
    swipeSoundsEnabled: true,
    gameSoundsEnabled: true,
    setSwipeSoundsEnabled: jest.fn(),
    setGameSoundsEnabled: jest.fn(),
  });
});

describe("useSoundEffects", () => {
  describe("play — respect du toggle", () => {
    it("joue swipe-like si swipeSoundsEnabled est true", async () => {
      const { result } = renderHook(() => useSoundEffects());
      await act(async () => {
        await result.current.play("swipe-like");
      });
      expect(anyPlayerPlayed()).toBe(true);
    });

    it("ne joue pas swipe-like si swipeSoundsEnabled est false", async () => {
      mockUseSoundSettingsStore.mockReturnValue({
        swipeSoundsEnabled: false,
        gameSoundsEnabled: true,
        setSwipeSoundsEnabled: jest.fn(),
        setGameSoundsEnabled: jest.fn(),
      });
      const { result } = renderHook(() => useSoundEffects());
      await act(async () => {
        await result.current.play("swipe-like");
      });
      expect(noPlayerPlayed()).toBe(true);
    });

    it("ne joue pas swipe-dislike si swipeSoundsEnabled est false", async () => {
      mockUseSoundSettingsStore.mockReturnValue({
        swipeSoundsEnabled: false,
        gameSoundsEnabled: true,
        setSwipeSoundsEnabled: jest.fn(),
        setGameSoundsEnabled: jest.fn(),
      });
      const { result } = renderHook(() => useSoundEffects());
      await act(async () => {
        await result.current.play("swipe-dislike");
      });
      expect(noPlayerPlayed()).toBe(true);
    });

    it("joue timer-warning si gameSoundsEnabled est true", async () => {
      const { result } = renderHook(() => useSoundEffects());
      await act(async () => {
        await result.current.play("timer-warning");
      });
      expect(anyPlayerPlayed()).toBe(true);
    });

    it("ne joue pas timer-warning si gameSoundsEnabled est false", async () => {
      mockUseSoundSettingsStore.mockReturnValue({
        swipeSoundsEnabled: true,
        gameSoundsEnabled: false,
        setSwipeSoundsEnabled: jest.fn(),
        setGameSoundsEnabled: jest.fn(),
      });
      const { result } = renderHook(() => useSoundEffects());
      await act(async () => {
        await result.current.play("timer-warning");
      });
      expect(noPlayerPlayed()).toBe(true);
    });

    it("ne joue pas timer-danger si gameSoundsEnabled est false", async () => {
      mockUseSoundSettingsStore.mockReturnValue({
        swipeSoundsEnabled: true,
        gameSoundsEnabled: false,
        setSwipeSoundsEnabled: jest.fn(),
        setGameSoundsEnabled: jest.fn(),
      });
      const { result } = renderHook(() => useSoundEffects());
      await act(async () => {
        await result.current.play("timer-danger");
      });
      expect(noPlayerPlayed()).toBe(true);
    });
  });

  describe("gestion d'erreur silencieuse", () => {
    it("ne lève pas d'exception si le player lance une erreur lors de play()", async () => {
      mockCreateAudioPlayer.mockImplementationOnce(
        () =>
          ({
            play: jest.fn(() => {
              throw new Error("audio error");
            }),
            seekTo: jest.fn(),
            remove: jest.fn(),
            volume: 1,
          }) as unknown as ReturnType<typeof createAudioPlayer>,
      );
      const { result } = renderHook(() => useSoundEffects());
      await expect(
        act(async () => {
          await result.current.play("swipe-like");
        }),
      ).resolves.not.toThrow();
    });

    it("ne lève pas d'exception si createAudioPlayer échoue au chargement", () => {
      mockCreateAudioPlayer.mockImplementationOnce(() => {
        throw new Error("load error");
      });
      expect(() => renderHook(() => useSoundEffects())).not.toThrow();
    });
  });

  describe("cleanup", () => {
    it("appelle remove() sur les players au démontage", () => {
      const { unmount } = renderHook(() => useSoundEffects());
      unmount();
      const allRemoved = mockCreateAudioPlayer.mock.results.every(
        (r) =>
          (r.value as ReturnType<typeof makePlayer>).remove.mock.calls.length >
          0,
      );
      expect(allRemoved).toBe(true);
    });
  });

});
