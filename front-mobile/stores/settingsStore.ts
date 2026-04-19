import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SettingsState {
  errorAnimationsEnabled: boolean;
  setErrorAnimationsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      errorAnimationsEnabled: true,
      setErrorAnimationsEnabled: (enabled) =>
        set({ errorAnimationsEnabled: enabled }),
    }),
    {
      name: "rythmix-settings",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
