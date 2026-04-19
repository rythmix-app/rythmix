import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PlayedGamesState {
  playedGameIds: number[];
  markGameAsPlayed: (gameId: number) => void;
}

export const usePlayedGamesStore = create<PlayedGamesState>()(
  persist(
    (set) => ({
      playedGameIds: [],
      markGameAsPlayed: (gameId) =>
        set((state) => ({
          playedGameIds: state.playedGameIds.includes(gameId)
            ? state.playedGameIds
            : [...state.playedGameIds, gameId],
        })),
    }),
    {
      name: "rythmix-played-games",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
