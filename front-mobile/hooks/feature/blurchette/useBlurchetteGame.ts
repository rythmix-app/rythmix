import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Alert, Keyboard, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { deezerAPI, DeezerGenre, DeezerTrack } from "@/services/deezer-api";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/components/Toast";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  createGameSession,
  updateGameSession,
} from "@/services/gameSessionService";
import {
  saveGameState,
  getGameState,
  deleteGameState,
} from "@/services/gameStorageService";
import { BlurchetteGameData } from "@/types/gameSession";
import { useErrorFeedback } from "@/hooks/useErrorFeedback";
import { useGenres } from "@/hooks/useGenres";
import { fuzzyMatch } from "@/utils/stringUtils";

export type GameState = "genreSelection" | "playing" | "result";
export type BlurLevel = 1 | 2 | 3 | 4 | 5;

export interface GameTrack {
  track: DeezerTrack;
  isAlbum: boolean;
}

interface BlurchetteAttempt {
  answer: string;
  isCorrect: boolean;
  blurLevel: number;
  timestamp: string;
}

interface BlurchetteSaveState {
  gameState: GameState;
  selectedGenre: DeezerGenre | null;
  currentTrack: GameTrack | null;
  blurLevel: BlurLevel;
  currentAttempts: BlurchetteAttempt[];
  sessionId: string | null;
  foundCorrect: boolean;
}

const BLUR_RADIUS_BY_LEVEL: Record<BlurLevel, number> = {
  1: 50,
  2: 35,
  3: 20,
  4: 10,
  5: 2,
};

export function getBlurRadius(level: BlurLevel): number {
  return BLUR_RADIUS_BY_LEVEL[level];
}

export function useBlurchetteGame() {
  const [gameState, setGameState] = useState<GameState>("genreSelection");
  const { genres, loadingGenres } = useGenres();
  const [loadingTrack, setLoadingTrack] = useState(false);

  const [currentTrack, setCurrentTrack] = useState<GameTrack | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<DeezerGenre | null>(null);

  const [blurLevel, setBlurLevel] = useState<BlurLevel>(1);
  const [answer, setAnswer] = useState("");
  const [foundCorrect, setFoundCorrect] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [currentAttempts, setCurrentAttempts] = useState<BlurchetteAttempt[]>(
    [],
  );

  const isSubmittingRef = useRef(false);

  const keyboardAnim = useRef(new Animated.Value(0)).current;

  const albumScale = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.6],
    extrapolate: "clamp",
  });

  const albumOpacity = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.6],
    extrapolate: "clamp",
  });

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardAnim, {
        toValue: 1,
        duration: Platform.OS === "ios" ? e.duration : 200,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardAnim, {
        toValue: 0,
        duration: Platform.OS === "ios" ? e.duration : 200,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardAnim]);

  const { gameId, resume } = useLocalSearchParams<{
    gameId: string;
    resume?: string;
  }>();
  const user = useAuthStore((state) => state.user);
  const { errorAnimationsEnabled } = useSettingsStore();
  const { show } = useToast();
  const { shakeAnimation, borderOpacity, errorMessage, triggerError } =
    useErrorFeedback(errorAnimationsEnabled);

  const loadSavedState = useCallback(async () => {
    if (!gameId) return;
    setLoadingTrack(true);
    try {
      const saved = await getGameState<BlurchetteSaveState>(gameId);
      if (saved) {
        setGameState(saved.gameState);
        setSelectedGenre(saved.selectedGenre);
        setCurrentTrack(saved.currentTrack);
        setBlurLevel(saved.blurLevel);
        setCurrentAttempts(saved.currentAttempts);
        setSessionId(saved.sessionId);
        setFoundCorrect(saved.foundCorrect);
      }
    } catch (error) {
      console.error("Failed to load saved state:", error);
      show({ type: "error", message: "Impossible de reprendre la partie" });
    } finally {
      setLoadingTrack(false);
    }
  }, [gameId, show]);

  useEffect(() => {
    if (!gameId) return;
    if (resume === "true") {
      void loadSavedState();
      return;
    }
    void deleteGameState(gameId);
  }, [gameId, resume, loadSavedState]);

  const autoSave = useCallback(async () => {
    if (!gameId || gameState === "result") return;

    const saveState: BlurchetteSaveState = {
      gameState,
      selectedGenre,
      currentTrack,
      blurLevel,
      currentAttempts,
      sessionId,
      foundCorrect,
    };

    await saveGameState(gameId, saveState);
  }, [
    gameId,
    gameState,
    selectedGenre,
    currentTrack,
    blurLevel,
    currentAttempts,
    sessionId,
    foundCorrect,
  ]);

  useEffect(() => {
    if (gameState !== "result" && gameState !== "genreSelection" && gameId) {
      void autoSave();
    }
  }, [gameState, gameId, blurLevel, currentAttempts, autoSave]);

  const startGame = useCallback(
    async (genre: DeezerGenre) => {
      setLoadingTrack(true);
      setSelectedGenre(genre);

      try {
        const response = await deezerAPI.getGenreTracks(genre.id, 50);

        if (!response.data || response.data.length === 0) {
          show({
            type: "error",
            message: "Aucune musique trouvée pour ce genre",
          });
          return;
        }

        const randomIndex = Math.floor(Math.random() * response.data.length);
        const randomTrack = response.data[randomIndex];

        const gameTrack: GameTrack = {
          track: randomTrack,
          isAlbum:
            randomTrack.album.title.toLowerCase() !==
            randomTrack.title.toLowerCase(),
        };

        if (!gameId || !user) {
          setSessionError(true);
          return;
        }

        const gameData: BlurchetteGameData = {
          genre: { id: genre.id, name: genre.name },
          track: {
            id: randomTrack.id,
            title: randomTrack.title,
            artistId: randomTrack.artist.id,
            artistName: randomTrack.artist.name,
            albumId: randomTrack.album.id,
            albumTitle: randomTrack.album.title,
            coverUrl: randomTrack.album.cover_xl,
          },
          isAlbum: gameTrack.isAlbum,
          currentBlurLevel: 1,
          attempts: [],
          foundCorrect: null,
          finalBlurLevel: null,
          startedAt: new Date().toISOString(),
          completedAt: null,
        };

        const session = await createGameSession({
          gameId: parseInt(gameId, 10),
          status: "active",
          players: [{ userId: user.id }],
          gameData: gameData as unknown as Record<string, unknown>,
        });

        setSessionId(session.id);
        setCurrentAttempts([]);
        setCurrentTrack(gameTrack);
        setBlurLevel(1);
        setAnswer("");
        setFoundCorrect(false);
        setGameState("playing");
      } catch (error) {
        console.error("Failed to start game:", error);
        show({ type: "error", message: "Impossible de démarrer la partie" });
      } finally {
        setLoadingTrack(false);
      }
    },
    [gameId, user, show],
  );

  const submitAnswer = useCallback(async () => {
    if (isSubmittingRef.current) return;
    if (!answer.trim() || !currentTrack) return;

    isSubmittingRef.current = true;
    try {
      const albumTitle = currentTrack.track.album.title;
      const artistName = currentTrack.track.artist.name;
      const trackTitle = currentTrack.track.title;

      let isCorrect = fuzzyMatch(answer, artistName);
      if (!isCorrect) {
        isCorrect = currentTrack.isAlbum
          ? fuzzyMatch(answer, albumTitle)
          : fuzzyMatch(answer, trackTitle);
      }

      const newAttempt: BlurchetteAttempt = {
        answer: answer.trim(),
        isCorrect,
        blurLevel,
        timestamp: new Date().toISOString(),
      };

      const updatedAttempts = [...currentAttempts, newAttempt];
      setCurrentAttempts(updatedAttempts);

      if (sessionId) {
        try {
          const isGameComplete = isCorrect || blurLevel >= 5;
          const updateData: Partial<BlurchetteGameData> = {
            currentBlurLevel: isCorrect
              ? blurLevel
              : Math.min(blurLevel + 1, 5),
            attempts: updatedAttempts,
          };

          if (isGameComplete) {
            updateData.foundCorrect = isCorrect;
            updateData.finalBlurLevel = blurLevel;
            updateData.completedAt = new Date().toISOString();

            await updateGameSession(sessionId, {
              status: "completed",
              gameData: updateData as unknown as Record<string, unknown>,
            });

            if (gameId) void deleteGameState(gameId);
          } else {
            await updateGameSession(sessionId, {
              gameData: updateData as unknown as Record<string, unknown>,
            });
          }
        } catch (err) {
          console.error("Failed to update session:", err);
        }
      }

      if (isCorrect) {
        setFoundCorrect(true);
        setGameState("result");
        return;
      }

      if (blurLevel < 5) {
        setBlurLevel((level) => (level + 1) as BlurLevel);
        triggerError("Ce n'est pas la bonne réponse, continuez !");
        setAnswer("");
      } else {
        setFoundCorrect(false);
        setGameState("result");
      }
    } finally {
      isSubmittingRef.current = false;
    }
  }, [
    answer,
    currentTrack,
    currentAttempts,
    sessionId,
    blurLevel,
    gameId,
    triggerError,
  ]);

  const handleAbandon = useCallback(() => {
    Alert.alert(
      "Abandonner",
      "Êtes-vous sûr de vouloir abandonner cette partie ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui",
          style: "destructive",
          onPress: async () => {
            try {
              if (sessionId) {
                await updateGameSession(sessionId, {
                  status: "completed",
                  gameData: {
                    foundCorrect: false,
                    finalBlurLevel: blurLevel,
                    completedAt: new Date().toISOString(),
                    attempts: currentAttempts,
                  } as unknown as Record<string, unknown>,
                });
              }
              if (gameId) await deleteGameState(gameId);
            } catch (err) {
              console.error("Failed to abandon game:", err);
              show({
                type: "error",
                message: "Impossible de synchroniser l'abandon",
              });
            } finally {
              setFoundCorrect(false);
              setGameState("result");
            }
          },
        },
      ],
    );
  }, [sessionId, blurLevel, currentAttempts, gameId, show]);

  const resetGame = useCallback(() => {
    if (gameId) void deleteGameState(gameId);
    setGameState("genreSelection");
    setCurrentTrack(null);
    setSelectedGenre(null);
    setBlurLevel(1);
    setAnswer("");
    setFoundCorrect(false);
    setCurrentAttempts([]);
    setSessionId(null);
  }, [gameId]);

  return {
    gameState,
    genres,
    loadingGenres,
    loadingTrack,
    currentTrack,
    blurLevel,
    answer,
    setAnswer,
    foundCorrect,
    sessionId,
    sessionError,
    albumScale,
    albumOpacity,
    shakeAnimation,
    borderOpacity,
    errorMessage,
    errorAnimationsEnabled,
    startGame,
    submitAnswer,
    handleAbandon,
    resetGame,
    autoSave,
  };
}
