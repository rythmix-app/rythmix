import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { deezerAPI } from "@/services/deezer-api";
import { useAuthStore } from "@/stores/authStore";
import {
  createGameSession,
  updateGameSession,
} from "@/services/gameSessionService";
import {
  saveGameState,
  getGameState,
  deleteGameState,
} from "@/services/gameStorageService";
import { HigherOrLowerRound } from "@/types/gameSession";

export type GameMode = "artist" | "album" | null;
export type PlusOuMoinsGameState =
  | "selection"
  | "loading"
  | "playing"
  | "reveal"
  | "wrong"
  | "result";

export interface TargetData {
  id: number;
  name: string;
  score: number;
  image: string;
}

interface PlusOuMoinsSaveState {
  mode: GameMode;
  gameState: PlusOuMoinsGameState;
  targetA: TargetData | null;
  targetB: TargetData | null;
  streak: number;
  rounds: HigherOrLowerRound[];
  sessionId: string | null;
  targetPool: TargetData[];
  currentTargetIndex: number;
  usedIds: number[];
}

const STORAGE_KEYS = {
  ARTIST_BEST: "higher_lower_best_artist",
  ALBUM_BEST: "higher_lower_best_album",
};

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function usePlusOuMoinsGame() {
  const { gameId, resume } = useLocalSearchParams<{
    gameId: string;
    resume?: string;
  }>();
  const user = useAuthStore((state) => state.user);

  const [mode, setMode] = useState<GameMode>(null);
  const [gameState, setGameState] = useState<PlusOuMoinsGameState>("selection");
  const [targetA, setTargetA] = useState<TargetData | null>(null);
  const [targetB, setTargetB] = useState<TargetData | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreakArtist, setBestStreakArtist] = useState(0);
  const [bestStreakAlbum, setBestStreakAlbum] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rounds, setRounds] = useState<HigherOrLowerRound[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const usedIds = useRef<Set<number>>(new Set());
  const targetPool = useRef<TargetData[]>([]);
  const currentTargetIndex = useRef(0);
  const revealOpacity = useSharedValue(0);

  // Charger les records persistants
  useEffect(() => {
    const loadBestStreaks = async () => {
      try {
        const [artistBest, albumBest] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.ARTIST_BEST),
          AsyncStorage.getItem(STORAGE_KEYS.ALBUM_BEST),
        ]);
        if (artistBest) setBestStreakArtist(parseInt(artistBest, 10));
        if (albumBest) setBestStreakAlbum(parseInt(albumBest, 10));
      } catch (e) {
        console.error("Failed to load best streaks", e);
      }
    };
    loadBestStreaks();
  }, []);

  const autoSave = useCallback(async () => {
    if (!gameId || gameState === "result" || gameState === "selection" || !mode)
      return;

    const saveState: PlusOuMoinsSaveState = {
      mode,
      gameState: "playing", // On sauvegarde toujours en état "playing" pour la reprise
      targetA,
      targetB,
      streak,
      rounds,
      sessionId,
      targetPool: targetPool.current,
      currentTargetIndex: currentTargetIndex.current,
      usedIds: Array.from(usedIds.current),
    };

    await saveGameState(gameId, saveState);
  }, [gameId, mode, gameState, targetA, targetB, streak, rounds, sessionId]);

  useEffect(() => {
    if (gameState === "playing" && gameId) {
      void autoSave();
    }
  }, [gameState, streak, rounds, autoSave, gameId]);

  const loadSavedState = useCallback(async () => {
    if (!gameId) return;
    try {
      const saved = await getGameState<PlusOuMoinsSaveState>(gameId);
      if (saved) {
        console.log(
          "[HigherOrLower] Resuming saved game, sessionId:",
          saved.sessionId,
        );
        setMode(saved.mode);
        setTargetA(saved.targetA);
        setTargetB(saved.targetB);
        setStreak(saved.streak);
        setRounds(saved.rounds);
        setSessionId(saved.sessionId);
        targetPool.current = saved.targetPool;
        currentTargetIndex.current = saved.currentTargetIndex;
        usedIds.current = new Set(saved.usedIds);
        setGameState("playing");
        setIsCorrect(null);
        revealOpacity.value = 0;
      }
    } catch (e) {
      console.error("Failed to load saved state", e);
    }
  }, [gameId, revealOpacity]);

  useEffect(() => {
    if (!gameId) return;
    if (resume === "true") {
      void loadSavedState();
    } else {
      void deleteGameState(gameId);
    }
  }, [gameId, resume, loadSavedState]);

  const saveBestStreak = async (
    newScore: number,
    gameMode: "artist" | "album",
  ) => {
    try {
      const key =
        gameMode === "artist"
          ? STORAGE_KEYS.ARTIST_BEST
          : STORAGE_KEYS.ALBUM_BEST;
      await AsyncStorage.setItem(key, newScore.toString());
      if (gameMode === "artist") setBestStreakArtist(newScore);
      else setBestStreakAlbum(newScore);
    } catch (e) {
      console.error("Failed to save best streak", e);
    }
  };

  const loadMoreInBackground = async (
    remaining: any[],
    selectedMode: GameMode,
  ) => {
    for (const item of remaining) {
      try {
        let full: TargetData | null = null;
        if (selectedMode === "artist") {
          const data = await deezerAPI.getArtist(item.id);
          full = {
            id: data.id,
            name: data.name,
            score: data.nb_fan,
            image: data.picture_xl || data.picture_big,
          };
        } else {
          const data = await deezerAPI.getAlbum(item.id);
          full = {
            id: data.id,
            name: data.title,
            score: data.fans,
            image: data.cover_xl || data.cover_big,
          };
        }
        if (full && full.image && full.score !== undefined)
          targetPool.current = [...targetPool.current, full];
      } catch (e) {}
    }
  };

  const loadInitialData = useCallback(
    async (selectedMode: GameMode) => {
      if (!selectedMode || !user) return;
      setGameState("loading");
      setMode(selectedMode);
      usedIds.current.clear();
      targetPool.current = [];
      currentTargetIndex.current = 0;

      try {
        let rawData: any[] = [];
        if (selectedMode === "artist") {
          const response = await deezerAPI.getTopArtists(50);
          rawData = shuffleArray(response?.data || []);
        } else {
          const response = await deezerAPI.getTopAlbums(50);
          rawData = shuffleArray(response?.data || []);
        }

        if (!rawData || rawData.length < 2)
          throw new Error("Données Deezer insuffisantes.");

        const itemsToEnrich = rawData.slice(0, 15);
        const enriched = await Promise.all(
          itemsToEnrich.map(async (item) => {
            try {
              if (selectedMode === "artist") {
                const full = await deezerAPI.getArtist(item.id);
                return {
                  id: full.id,
                  name: full.name,
                  score: full.nb_fan,
                  image: full.picture_xl || full.picture_big,
                };
              } else {
                const full = await deezerAPI.getAlbum(item.id);
                return {
                  id: full.id,
                  name: full.title,
                  score: full.fans,
                  image: full.cover_xl || full.cover_big,
                };
              }
            } catch (e) {
              return null;
            }
          }),
        );

        const filtered = enriched.filter(
          (t): t is TargetData =>
            t !== null && !!t.image && t.score !== undefined,
        );
        if (filtered.length < 2)
          throw new Error("Données enrichies insuffisantes.");

        targetPool.current = filtered;
        setTargetA(filtered[0]);
        setTargetB(filtered[1]);
        usedIds.current.add(filtered[0].id);
        usedIds.current.add(filtered[1].id);
        currentTargetIndex.current = 1;

        const currentBest =
          selectedMode === "artist" ? bestStreakArtist : bestStreakAlbum;

        // Création de la session avec l'utilisateur
        try {
          console.log(
            "[HigherOrLower] Creating session for gameId:",
            gameId,
            "user:",
            user.id,
          );
          const session = await createGameSession({
            gameId: Number(gameId),
            status: "active",
            players: [{ userId: user.id }],
            gameData: {
              mode: selectedMode,
              totalRounds: 0,
              streak: 0,
              bestStreak: currentBest,
              rounds: [],
              startedAt: new Date().toISOString(),
              completedAt: null,
            } as unknown as Record<string, unknown>,
          });
          console.log(
            "[HigherOrLower] Session created successfully:",
            session.id,
          );
          setSessionId(session.id);
        } catch (e) {
          console.error(
            "[HigherOrLower] CRITICAL: Session creation failed:",
            e,
          );
        }

        setGameState("playing");
        if (rawData.length > 15)
          loadMoreInBackground(rawData.slice(15), selectedMode);
      } catch (error) {
        console.error("[HigherOrLower] Load Error:", error);
        Alert.alert("Erreur", "Impossible de charger les données.");
        setGameState("selection");
        setMode(null);
      }
    },
    [gameId, user, bestStreakArtist, bestStreakAlbum],
  );

  const finishGame = useCallback(
    (finalRounds: HigherOrLowerRound[], finalStreak: number) => {
      const currentBest =
        mode === "artist" ? bestStreakArtist : bestStreakAlbum;
      const sessionBest = Math.max(currentBest, finalStreak);

      if (sessionId) {
        updateGameSession(sessionId, {
          status: "completed",
          gameData: {
            mode: mode || "artist",
            totalRounds: finalRounds.length,
            streak: finalStreak,
            bestStreak: sessionBest,
            rounds: finalRounds,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          } as unknown as Record<string, unknown>,
        }).catch(console.error);
      }
      if (gameId) void deleteGameState(gameId);
      setGameState("result");
    },
    [mode, bestStreakArtist, bestStreakAlbum, sessionId, gameId],
  );

  const handleGuess = async (guess: "higher" | "lower") => {
    if (gameState !== "playing" || !targetA || !targetB || !mode) return;
    setGameState("reveal");
    const correct =
      (guess === "higher" && targetB.score >= targetA.score) ||
      (guess === "lower" && targetB.score <= targetA.score);
    setIsCorrect(correct);
    revealOpacity.value = withTiming(1, { duration: 500 });

    const newRounds: HigherOrLowerRound[] = [
      ...rounds,
      {
        artistAId: targetA.id,
        artistAName: targetA.name,
        artistAFans: targetA.score,
        artistBId: targetB.id,
        artistBName: targetB.name,
        artistBFans: targetB.score,
        playerAnswer: guess,
        isCorrect: correct,
      },
    ];
    setRounds(newRounds);

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      const currentBest =
        mode === "artist" ? bestStreakArtist : bestStreakAlbum;
      if (newStreak > currentBest) {
        saveBestStreak(newStreak, mode);
      }

      // Mise à jour de la session en base (non-bloquant)
      if (sessionId) {
        updateGameSession(sessionId, {
          gameData: {
            mode: mode,
            totalRounds: newRounds.length,
            streak: newStreak,
            bestStreak: Math.max(currentBest, newStreak),
            rounds: newRounds,
          } as unknown as Record<string, unknown>,
        }).catch((e) =>
          console.warn("[HigherOrLower] Session update failed:", e),
        );
      }

      setTimeout(() => {
        currentTargetIndex.current += 1;
        if (currentTargetIndex.current >= targetPool.current.length) {
          finishGame(newRounds, newStreak);
          return;
        }
        setTargetA(targetB);
        setTargetB(targetPool.current[currentTargetIndex.current]);
        revealOpacity.value = 0;
        setIsCorrect(null);
        setGameState("playing");
      }, 1500);
    } else {
      setGameState("wrong");
      setTimeout(() => finishGame(newRounds, streak), 2000);
    }
  };

  const resetGame = useCallback(() => {
    setGameState("selection");
    setMode(null);
    setStreak(0);
    setRounds([]);
    setIsCorrect(null);
    setSessionId(null);
  }, []);

  const abandonGame = useCallback(() => {
    Alert.alert("Abandonner ?", "Voulez-vous arrêter ?", [
      { text: "Non", style: "cancel" },
      { text: "Oui", onPress: () => finishGame(rounds, streak) },
    ]);
  }, [rounds, streak, finishGame]);

  return {
    mode,
    gameState,
    targetA,
    targetB,
    streak,
    bestStreakArtist,
    bestStreakAlbum,
    sessionId,
    rounds,
    isCorrect,
    revealOpacity,
    loadInitialData,
    handleGuess,
    resetGame,
    abandonGame,
    autoSave,
  };
}
