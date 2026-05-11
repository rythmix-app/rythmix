import { act, renderHook } from "@testing-library/react-native";
import { useSoundSettingsStore } from "../soundSettingsStore";

describe("soundSettingsStore", () => {
  beforeEach(() => {
    act(() => {
      useSoundSettingsStore.setState({
        swipeSoundsEnabled: true,
        gameSoundsEnabled: true,
      });
    });
  });

  describe("état initial", () => {
    it("swipeSoundsEnabled est true par défaut", () => {
      const { result } = renderHook(() => useSoundSettingsStore());
      expect(result.current.swipeSoundsEnabled).toBe(true);
    });

    it("gameSoundsEnabled est true par défaut", () => {
      const { result } = renderHook(() => useSoundSettingsStore());
      expect(result.current.gameSoundsEnabled).toBe(true);
    });
  });

  describe("setSwipeSoundsEnabled", () => {
    it("désactive les sons de swipe", () => {
      const { result } = renderHook(() => useSoundSettingsStore());
      act(() => {
        result.current.setSwipeSoundsEnabled(false);
      });
      expect(result.current.swipeSoundsEnabled).toBe(false);
    });

    it("réactive les sons de swipe", () => {
      const { result } = renderHook(() => useSoundSettingsStore());
      act(() => {
        result.current.setSwipeSoundsEnabled(false);
        result.current.setSwipeSoundsEnabled(true);
      });
      expect(result.current.swipeSoundsEnabled).toBe(true);
    });
  });

  describe("setGameSoundsEnabled", () => {
    it("désactive les sons de jeu", () => {
      const { result } = renderHook(() => useSoundSettingsStore());
      act(() => {
        result.current.setGameSoundsEnabled(false);
      });
      expect(result.current.gameSoundsEnabled).toBe(false);
    });

    it("réactive les sons de jeu", () => {
      const { result } = renderHook(() => useSoundSettingsStore());
      act(() => {
        result.current.setGameSoundsEnabled(false);
        result.current.setGameSoundsEnabled(true);
      });
      expect(result.current.gameSoundsEnabled).toBe(true);
    });
  });

  describe("persistance AsyncStorage", () => {
    it("utilise la clé @rythmix/sound-settings", () => {
      const AsyncStorage = require("@react-native-async-storage/async-storage");
      act(() => {
        useSoundSettingsStore.getState().setSwipeSoundsEnabled(false);
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@rythmix/sound-settings",
        expect.any(String),
      );
    });
  });
});
