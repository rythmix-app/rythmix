import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { deezerAPI, DeezerGenre, DeezerTrack } from "@/services/deezer-api";
import { cacheManager } from "@/services/cache-manager";
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
import { BlindtestGameData, BlindtestRound } from "@/types/gameSession";
import { useErrorFeedback } from "@/hooks/useErrorFeedback";
import { useGenres } from "@/hooks/useGenres";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { fuzzyMatch, nearMatch } from "@/utils/stringUtils";

export type BlindtestGameState =
  | "genreSelection"
  | "ready"
  | "playing"
  | "roundReveal"
  | "result";

const TOTAL_ROUNDS = 5;
const ROUND_DURATION_S = 30;
const MIN_TRACKS_REQUIRED = 3;

/**
 * Extract featuring artist names from contributors field.
 * Returns names of contributors that are not the main artist.
 */
export function getFeaturing(track: DeezerTrack): string[] {
  if (!track.contributors || track.contributors.length <= 1) return [];
  return track.contributors
    .filter((c) => c.id !== track.artist.id)
    .map((c) => c.name);
}

interface BlindtestSaveState {
  gameState: BlindtestGameState;
  selectedGenre: DeezerGenre | null;
  tracks: DeezerTrack[];
  currentRoundIndex: number;
  timeRemaining: number;
  artistFound: boolean;
  foundFeaturings: string[];
  titleFound: boolean;
  roundStartTime: number | null;
  completedRounds: BlindtestRound[];
  sessionId: string | null;
}

export function useBlindtestGame() {
  const [gameState, setGameState] =
    useState<BlindtestGameState>("genreSelection");
  const { genres, loadingGenres } = useGenres();
  const [loadingTracks, setLoadingTracks] = useState(false);

  const [selectedGenre, setSelectedGenre] = useState<DeezerGenre | null>(null);
  const [tracks, setTracks] = useState<DeezerTrack[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);

  const [timeRemaining, setTimeRemaining] = useState(ROUND_DURATION_S);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [roundStartTime, setRoundStartTime] = useState<number | null>(null);

  const [answerInput, setAnswerInput] = useState("");
  const [artistFound, setArtistFound] = useState(false);
  const [foundFeaturings, setFoundFeaturings] = useState<string[]>([]);
  const [titleFound, setTitleFound] = useState(false);

  const [warmMessage, setWarmMessage] = useState<string | null>(null);
  const warmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [completedRounds, setCompletedRounds] = useState<BlindtestRound[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState(false);

  // Refs to track found state synchronously (avoids stale closures)
  const artistFoundRef = useRef(false);
  const foundFeaturingsRef = useRef<string[]>([]);
  const titleFoundRef = useRef(false);

  const isSubmittingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { gameId, resume } = useLocalSearchParams<{
    gameId: string;
    resume?: string;
  }>();
  const user = useAuthStore((state) => state.user);
  const { errorAnimationsEnabled } = useSettingsStore();
  const { show } = useToast();
  const { shakeAnimation, borderOpacity, errorMessage, triggerError } =
    useErrorFeedback(errorAnimationsEnabled);
  const handleAudioRetry = useCallback(
    async (track: DeezerTrack): Promise<DeezerTrack | null> => {
      try {
        await cacheManager.remove(`track:${track.id}`);
        const freshTrack = await deezerAPI.getTrack(track.id);
        setTracks((prev) =>
          prev.map((t) => (t.id === freshTrack.id ? freshTrack : t)),
        );
        return freshTrack;
      } catch {
        return null;
      }
    },
    [],
  );

  const audioPlayer = useAudioPlayer({ onRetry: handleAudioRetry });

  const currentTrack =
    tracks.length > currentRoundIndex ? tracks[currentRoundIndex] : null;
  const totalRounds = Math.min(TOTAL_ROUNDS, tracks.length);
  const currentFeaturingNames = currentTrack ? getFeaturing(currentTrack) : [];

  // --- Timer ---
  useEffect(() => {
    if (!isTimerRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTimerRunning]);

  // --- Timeout handler ---
  useEffect(() => {
    if (timeRemaining === 0 && gameState === "playing") {
      void endRound();
    }
  }, [timeRemaining, gameState]);

  // --- Save/Resume ---
  const loadSavedState = useCallback(async () => {
    if (!gameId) return;
    setLoadingTracks(true);
    try {
      const saved = await getGameState<BlindtestSaveState>(gameId);
      if (saved) {
        setGameState(saved.gameState);
        setSelectedGenre(saved.selectedGenre);
        setTracks(saved.tracks);
        setCurrentRoundIndex(saved.currentRoundIndex);
        setTimeRemaining(saved.timeRemaining);
        setArtistFound(saved.artistFound);
        setFoundFeaturings(saved.foundFeaturings);
        setTitleFound(saved.titleFound);
        artistFoundRef.current = saved.artistFound;
        foundFeaturingsRef.current = saved.foundFeaturings;
        titleFoundRef.current = saved.titleFound;
        setRoundStartTime(saved.roundStartTime);
        setCompletedRounds(saved.completedRounds);
        setSessionId(saved.sessionId);

        if (
          saved.gameState === "playing" &&
          saved.tracks[saved.currentRoundIndex]
        ) {
          void audioPlayer.play(saved.tracks[saved.currentRoundIndex]);
          setIsTimerRunning(true);
        }
      }
    } catch (error) {
      console.error("Failed to load saved state:", error);
      show({ type: "error", message: "Impossible de reprendre la partie" });
    } finally {
      setLoadingTracks(false);
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

    const saveState: BlindtestSaveState = {
      gameState,
      selectedGenre,
      tracks,
      currentRoundIndex,
      timeRemaining,
      artistFound,
      foundFeaturings,
      titleFound,
      roundStartTime,
      completedRounds,
      sessionId,
    };

    await saveGameState(gameId, saveState);
  }, [
    gameId,
    gameState,
    selectedGenre,
    tracks,
    currentRoundIndex,
    timeRemaining,
    artistFound,
    foundFeaturings,
    titleFound,
    roundStartTime,
    completedRounds,
    sessionId,
  ]);

  useEffect(() => {
    if (gameState === "playing" && gameId) {
      void autoSave();
    }
  }, [
    gameState,
    gameId,
    currentRoundIndex,
    artistFound,
    foundFeaturings,
    titleFound,
    completedRounds,
    autoSave,
  ]);

  // --- Cleanup audio on unmount ---
  useEffect(() => {
    return () => {
      void audioPlayer.stop();
    };
  }, []);

  // --- Game actions ---
  const startGame = useCallback(
    async (genre: DeezerGenre) => {
      setLoadingTracks(true);
      setSelectedGenre(genre);

      try {
        const response = await deezerAPI.getGenreTracks(genre.id, 50);

        if (!response.data || response.data.length === 0) {
          show({
            type: "error",
            message: "Aucune musique trouvée pour ce genre",
          });
          setLoadingTracks(false);
          return;
        }

        const tracksWithPreview = response.data.filter(
          (t) => t.preview && t.preview.startsWith("http"),
        );

        if (tracksWithPreview.length < MIN_TRACKS_REQUIRED) {
          show({
            type: "error",
            message: "Pas assez de morceaux disponibles pour ce genre",
          });
          setLoadingTracks(false);
          return;
        }

        const shuffled = [...tracksWithPreview].sort(() => Math.random() - 0.5);
        const picked = shuffled.slice(
          0,
          Math.min(TOTAL_ROUNDS, shuffled.length),
        );

        // Fetch each track individually to get contributors
        const enriched = await Promise.all(
          picked.map(async (t) => {
            try {
              return await deezerAPI.getTrack(t.id);
            } catch {
              return t;
            }
          }),
        );

        const valid = enriched.filter(
          (t) => t.preview && t.preview.startsWith("http"),
        );

        if (valid.length < MIN_TRACKS_REQUIRED) {
          show({
            type: "error",
            message: "Pas assez de morceaux disponibles pour ce genre",
          });
          setLoadingTracks(false);
          return;
        }

        if (!gameId || !user) {
          setSessionError(true);
          setLoadingTracks(false);
          return;
        }

        const gameData: BlindtestGameData = {
          genre: { id: genre.id, name: genre.name },
          totalRounds: valid.length,
          rounds: [],
          totalScore: 0,
          maxScore: valid.length * 3,
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
        setTracks(valid);
        setCurrentRoundIndex(0);
        setCompletedRounds([]);
        setGameState("ready");
      } catch (error) {
        console.error("Failed to start game:", error);
        show({ type: "error", message: "Impossible de démarrer la partie" });
      } finally {
        setLoadingTracks(false);
      }
    },
    [gameId, user, show],
  );

  const beginPlaying = useCallback(() => {
    if (tracks.length === 0) return;
    startRound(tracks[0]);
  }, [tracks]);

  const startRound = useCallback(
    (track: DeezerTrack) => {
      setAnswerInput("");
      setArtistFound(false);
      setFoundFeaturings([]);
      setTitleFound(false);
      setWarmMessage(null);
      artistFoundRef.current = false;
      foundFeaturingsRef.current = [];
      titleFoundRef.current = false;
      setTimeRemaining(ROUND_DURATION_S);
      setRoundStartTime(Date.now());
      setIsTimerRunning(true);
      setGameState("playing");
      void audioPlayer.play(track);
    },
    [audioPlayer],
  );

  const getRoundMaxScore = useCallback((track: DeezerTrack): number => {
    // 1 (artist) + N (featurings) + 1 (title)
    return 2 + getFeaturing(track).length;
  }, []);

  const buildRoundFromRefs = useCallback((): BlindtestRound => {
    const track = tracks[currentRoundIndex];
    const featuringNames = getFeaturing(track);
    const score =
      (artistFoundRef.current ? 1 : 0) +
      foundFeaturingsRef.current.length +
      (titleFoundRef.current ? 1 : 0);

    return {
      trackId: track.id,
      trackTitle: track.title_short || track.title,
      artistId: track.artist.id,
      artistName: track.artist.name,
      featuringNames,
      albumTitle: track.album.title,
      coverUrl: track.album.cover_xl || track.album.cover_big,
      artistCorrect: artistFoundRef.current,
      featuringFoundNames: [...foundFeaturingsRef.current],
      titleCorrect: titleFoundRef.current,
      bonusEarned: false,
      timeTakenMs: roundStartTime ? Date.now() - roundStartTime : 0,
      roundScore: score,
    };
  }, [tracks, currentRoundIndex, roundStartTime]);

  const endRound = useCallback(async () => {
    setIsTimerRunning(false);
    void audioPlayer.stop();

    const round = buildRoundFromRefs();
    const updatedRounds = [...completedRounds, round];
    setCompletedRounds(updatedRounds);

    if (sessionId) {
      try {
        const totalScore = updatedRounds.reduce((s, r) => s + r.roundScore, 0);
        await updateGameSession(sessionId, {
          gameData: {
            rounds: updatedRounds,
            totalScore,
          } as unknown as Record<string, unknown>,
        });
      } catch (err) {
        console.error("Failed to update session:", err);
      }
    }

    setGameState("roundReveal");
  }, [audioPlayer, buildRoundFromRefs, completedRounds, sessionId]);

  const submitAnswer = useCallback(() => {
    if (isSubmittingRef.current) return;
    const input = answerInput.trim();
    if (!input || !currentTrack) return;

    isSubmittingRef.current = true;
    try {
      let matched = false;
      const titleToMatch = currentTrack.title_short || currentTrack.title;
      const allFeaturings = currentFeaturingNames;

      // Check artist
      if (
        !artistFoundRef.current &&
        fuzzyMatch(input, currentTrack.artist.name)
      ) {
        setArtistFound(true);
        artistFoundRef.current = true;
        matched = true;
      }

      // Check each featuring individually
      for (const featName of allFeaturings) {
        if (
          !foundFeaturingsRef.current.includes(featName) &&
          fuzzyMatch(input, featName)
        ) {
          const updated = [...foundFeaturingsRef.current, featName];
          setFoundFeaturings(updated);
          foundFeaturingsRef.current = updated;
          matched = true;
          break; // one match per submission
        }
      }

      // Check title
      if (!titleFoundRef.current && fuzzyMatch(input, titleToMatch)) {
        setTitleFound(true);
        titleFoundRef.current = true;
        matched = true;
      }

      setAnswerInput("");

      if (matched) {
        const allFeaturingsFound =
          allFeaturings.length === 0 ||
          foundFeaturingsRef.current.length === allFeaturings.length;

        if (
          artistFoundRef.current &&
          allFeaturingsFound &&
          titleFoundRef.current
        ) {
          void endRound();
        }
      } else {
        // Check near match
        const targets: string[] = [];
        if (!artistFoundRef.current) targets.push(currentTrack.artist.name);
        for (const f of allFeaturings) {
          if (!foundFeaturingsRef.current.includes(f)) targets.push(f);
        }
        if (!titleFoundRef.current) targets.push(titleToMatch);

        const isClose = targets.some((t) => nearMatch(input, t));

        if (isClose) {
          if (warmTimerRef.current) clearTimeout(warmTimerRef.current);
          setWarmMessage("Presque !");
          warmTimerRef.current = setTimeout(() => setWarmMessage(null), 1500);
        } else {
          triggerError("Mauvaise réponse !");
        }
      }
    } finally {
      isSubmittingRef.current = false;
    }
  }, [
    answerInput,
    currentTrack,
    currentFeaturingNames,
    triggerError,
    endRound,
  ]);

  const nextRound = useCallback(() => {
    const nextIndex = currentRoundIndex + 1;

    if (nextIndex >= totalRounds) {
      void finishGame();
      return;
    }

    setCurrentRoundIndex(nextIndex);
    startRound(tracks[nextIndex]);
  }, [currentRoundIndex, totalRounds, tracks, startRound]);

  const finishGame = useCallback(async () => {
    const totalScore = completedRounds.reduce((s, r) => s + r.roundScore, 0);

    if (sessionId) {
      try {
        await updateGameSession(sessionId, {
          status: "completed",
          gameData: {
            rounds: completedRounds,
            totalScore,
            completedAt: new Date().toISOString(),
          } as unknown as Record<string, unknown>,
        });
      } catch (err) {
        console.error("Failed to complete session:", err);
      }
    }

    if (gameId) void deleteGameState(gameId);
    setGameState("result");
  }, [completedRounds, sessionId, gameId]);

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
            setIsTimerRunning(false);
            void audioPlayer.stop();

            try {
              if (sessionId) {
                const totalScore = completedRounds.reduce(
                  (s, r) => s + r.roundScore,
                  0,
                );
                await updateGameSession(sessionId, {
                  status: "completed",
                  gameData: {
                    rounds: completedRounds,
                    totalScore,
                    completedAt: new Date().toISOString(),
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
              setGameState("result");
            }
          },
        },
      ],
    );
  }, [sessionId, completedRounds, gameId, audioPlayer, show]);

  const resetGame = useCallback(() => {
    if (gameId) void deleteGameState(gameId);
    void audioPlayer.stop();
    setGameState("genreSelection");
    setSelectedGenre(null);
    setWarmMessage(null);
    setTracks([]);
    setCurrentRoundIndex(0);
    setTimeRemaining(ROUND_DURATION_S);
    setIsTimerRunning(false);
    setRoundStartTime(null);
    setAnswerInput("");
    setArtistFound(false);
    setFoundFeaturings([]);
    setTitleFound(false);
    artistFoundRef.current = false;
    foundFeaturingsRef.current = [];
    titleFoundRef.current = false;
    setCompletedRounds([]);
    setSessionId(null);
  }, [gameId, audioPlayer]);

  return {
    gameState,
    genres,
    loadingGenres,
    loadingTracks,
    currentTrack,
    currentFeaturingNames,
    currentRoundIndex,
    totalRounds,
    timeRemaining,
    roundDuration: ROUND_DURATION_S,
    answerInput,
    setAnswerInput,
    artistFound,
    foundFeaturings,
    titleFound,
    warmMessage,
    completedRounds,
    tracks,
    sessionId,
    sessionError,
    audioPlayer,
    shakeAnimation,
    borderOpacity,
    errorMessage,
    errorAnimationsEnabled,
    startGame,
    beginPlaying,
    submitAnswer,
    nextRound,
    handleAbandon,
    resetGame,
    autoSave,
    getRoundMaxScore,
  };
}
