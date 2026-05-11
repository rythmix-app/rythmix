import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SoundSettings {
  swipeSoundsEnabled: boolean;
  gameSoundsEnabled: boolean;
  setSwipeSoundsEnabled: (v: boolean) => void;
  setGameSoundsEnabled: (v: boolean) => void;
}

export const useSoundSettingsStore = create<SoundSettings>()(
  persist(
    (set) => ({
      swipeSoundsEnabled: true,
      gameSoundsEnabled: true,
      setSwipeSoundsEnabled: (v) => set({ swipeSoundsEnabled: v }),
      setGameSoundsEnabled: (v) => set({ gameSoundsEnabled: v }),
    }),
    {
      name: "@rythmix/sound-settings",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
