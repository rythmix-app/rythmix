import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  deezerAPI,
  DeezerAlbum,
  DeezerArtist,
  DeezerTrack,
} from "@/services/deezer-api";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/components/Toast";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  createGameSession,
  getMyActiveSession,
  updateGameSession,
} from "@/services/gameSessionService";
import {
  saveGameState,
  getGameState,
  deleteGameState,
} from "@/services/gameStorageService";
import { TracklistGameData, TrackAnswer } from "@/types/gameSession";
import { useErrorFeedback } from "@/hooks/useErrorFeedback";
import { fuzzyMatch } from "@/utils/stringUtils";

export type GameState =
  | "artistSearch"
  | "albumSelection"
  | "playing"
  | "result";

export interface GameAlbum {
  album: DeezerAlbum;
  tracks: DeezerTrack[];
}

export interface AnswerFeedback {
  type: "correct" | "wrong";
  message: string;
}

interface TracklistSaveState {
  gameState: GameState;
  searchQuery: string;
  selectedArtist: DeezerArtist | null;
  candidateAlbums: DeezerAlbum[];
  currentAlbum: GameAlbum | null;
  foundTrackIds: number[];
  timeRemaining: number;
  validatedAnswers: TrackAnswer[];
  sessionId: string | null;
}

export const GAME_DURATION = 300;
const ALBUM_CHOICES = 6;

export function useTracklistGame() {
  const [gameState, setGameState] = useState<GameState>("artistSearch");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingAlbum, setLoadingAlbum] = useState(false);

  const [candidateAlbums, setCandidateAlbums] = useState<DeezerAlbum[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<DeezerArtist | null>(
    null,
  );

  const [currentAlbum, setCurrentAlbum] = useState<GameAlbum | null>(null);
  const [currentInput, setCurrentInput] = useState("");
  const [foundTrackIds, setFoundTrackIds] = useState<Set<number>>(new Set());
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback | null>(
    null,
  );
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [validatedAnswers, setValidatedAnswers] = useState<TrackAnswer[]>([]);

  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingAnswerRef = useRef(false);
  const isSubmittingRef = useRef(false);

  const { gameId, resume } = useLocalSearchParams<{
    gameId: string;
    resume?: string;
  }>();
  const user = useAuthStore((state) => state.user);
  const { errorAnimationsEnabled } = useSettingsStore();
  const { show } = useToast();
  const { shakeAnimation, borderOpacity, triggerError } = useErrorFeedback(
    errorAnimationsEnabled,
  );

  const loadSavedState = useCallback(async () => {
    if (!gameId) return;
    setLoadingAlbum(true);
    try {
      const saved = await getGameState<TracklistSaveState>(gameId);
      if (saved) {
        setGameState(saved.gameState);
        setSearchQuery(saved.searchQuery || "");
        setSelectedArtist(saved.selectedArtist);
        setCandidateAlbums(saved.candidateAlbums);
        setCurrentAlbum(saved.currentAlbum);
        setFoundTrackIds(new Set(saved.foundTrackIds));
        setTimeRemaining(saved.timeRemaining);
        setValidatedAnswers(saved.validatedAnswers);
        setSessionId(saved.sessionId);

        if (saved.gameState === "playing") {
          setIsTimerRunning(true);
        }
      }
    } catch (error) {
      console.error("Failed to load saved state:", error);
      show({ type: "error", message: "Impossible de reprendre la partie" });
    } finally {
      setLoadingAlbum(false);
    }
  }, [gameId, show]);

  useEffect(() => {
    if (!gameId) return;
    if (resume === "true") {
      void loadSavedState();
      return;
    }
    void deleteGameState(gameId);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<null>((resolve) => {
      timeoutId = setTimeout(() => resolve(null), 5000);
    });
    Promise.race([getMyActiveSession(Number(gameId)), timeoutPromise])
      .catch(() => {})
      .finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
      });
  }, [gameId, resume, loadSavedState]);

  useEffect(() => {
    if (!isTimerRunning || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, timeRemaining]);

  const autoSave = useCallback(async () => {
    if (!gameId || gameState === "result") return;

    const saveState: TracklistSaveState = {
      gameState,
      searchQuery,
      selectedArtist,
      candidateAlbums,
      currentAlbum,
      foundTrackIds: Array.from(foundTrackIds),
      timeRemaining,
      validatedAnswers,
      sessionId,
    };

    await saveGameState(gameId, saveState);
  }, [
    gameId,
    gameState,
    searchQuery,
    selectedArtist,
    candidateAlbums,
    currentAlbum,
    foundTrackIds,
    timeRemaining,
    validatedAnswers,
    sessionId,
  ]);

  useEffect(() => {
    if (gameState !== "result" && gameState !== "artistSearch" && gameId) {
      void autoSave();
    }
  }, [gameState, gameId, autoSave]);

  const submitAnswers = useCallback(
    async (finalFoundIds?: Set<number>, finalAnswers?: TrackAnswer[]) => {
      if (!currentAlbum || isSubmittingRef.current) return;
      isSubmittingRef.current = true;

      try {
        setIsTimerRunning(false);
        const usedFoundIds = finalFoundIds ?? foundTrackIds;
        const usedAnswers = finalAnswers ?? validatedAnswers;
        const score = usedFoundIds.size;

        if (sessionId) {
          try {
            const finalData: Partial<TracklistGameData> = {
              answers: usedAnswers,
              score,
              timeElapsed: GAME_DURATION - timeRemaining,
              completedAt: new Date().toISOString(),
            };

            await updateGameSession(sessionId, {
              status: "completed",
              gameData: finalData as unknown as Record<string, unknown>,
            });
          } catch (err) {
            console.error("Failed to update session:", err);
          }
        }

        if (gameId) {
          void deleteGameState(gameId);
        }

        setGameState("result");
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [
      currentAlbum,
      foundTrackIds,
      validatedAnswers,
      sessionId,
      timeRemaining,
      gameId,
    ],
  );

  useEffect(() => {
    if (timeRemaining === 0 && !isTimerRunning && gameState === "playing") {
      void submitAnswers();
    }
  }, [timeRemaining, isTimerRunning, gameState, submitAnswers]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (gameState !== "playing" && feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
      setAnswerFeedback(null);
    }
  }, [gameState]);

  const handleSelectArtist = useCallback(
    async (artist: DeezerArtist) => {
      setLoadingAlbum(true);
      setSelectedArtist(artist);

      try {
        const albumsResponse = await deezerAPI.getArtistAlbums(artist.id, 25);

        if (!albumsResponse.data || albumsResponse.data.length === 0) {
          show({
            type: "error",
            message: "Aucun album trouvé pour cet artiste",
          });
          return;
        }

        const albums = albumsResponse.data.filter(
          (a) => a.record_type === "album" || a.record_type === "ep",
        );
        const pool = albums.length > 0 ? albums : albumsResponse.data;
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        setCandidateAlbums(shuffled.slice(0, ALBUM_CHOICES));
        setGameState("albumSelection");
      } catch (error) {
        console.error("Failed to load albums:", error);
        show({ type: "error", message: "Impossible de charger les albums" });
      } finally {
        setLoadingAlbum(false);
      }
    },
    [show],
  );

  const startGameWithAlbum = useCallback(
    async (album: DeezerAlbum) => {
      if (!gameId || !user) {
        setSessionError(true);
        return;
      }

      setLoadingAlbum(true);

      try {
        const tracksResponse = await deezerAPI.getAlbumTracks(album.id);

        if (!tracksResponse.data || tracksResponse.data.length < 5) {
          show({
            type: "warning",
            message:
              "Cet album n'a pas assez de titres. Choisissez-en un autre.",
          });
          return;
        }

        const gameAlbum: GameAlbum = {
          album,
          tracks: tracksResponse.data,
        };

        const gameData: TracklistGameData = {
          genre: { id: 0, name: "Search" },
          album: {
            id: album.id,
            title: album.title,
            artistName: album.artist?.name ?? selectedArtist?.name ?? "",
            coverUrl: album.cover_xl,
            totalTracks: tracksResponse.data.length,
          },
          answers: [],
          score: 0,
          maxScore: tracksResponse.data.length,
          timeElapsed: 0,
          startedAt: new Date().toISOString(),
          completedAt: "",
        };

        const session = await createGameSession({
          gameId: parseInt(gameId, 10),
          status: "active",
          players: [{ userId: user.id }],
          gameData: gameData as unknown as Record<string, unknown>,
        });

        setSessionId(session.id);
        setValidatedAnswers([]);
        setFoundTrackIds(new Set());
        setCurrentInput("");
        setCurrentAlbum(gameAlbum);
        setTimeRemaining(GAME_DURATION);
        setIsTimerRunning(true);
        setGameState("playing");
      } catch (error) {
        console.error("Failed to start game:", error);
        show({ type: "error", message: "Impossible de démarrer la partie" });
      } finally {
        setLoadingAlbum(false);
      }
    },
    [gameId, user, selectedArtist, show],
  );

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const showFeedback = useCallback(
    (type: "correct" | "wrong", message: string) => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      setAnswerFeedback({ type, message });
      feedbackTimeoutRef.current = setTimeout(
        () => setAnswerFeedback(null),
        1500,
      );
    },
    [],
  );

  const handleSubmitAnswer = useCallback(() => {
    if (isProcessingAnswerRef.current) return;
    const trimmed = currentInput.trim();
    if (!trimmed || !currentAlbum) return;

    isProcessingAnswerRef.current = true;

    const matchedTrack = currentAlbum.tracks.find(
      (track) =>
        !foundTrackIds.has(track.id) &&
        (fuzzyMatch(trimmed, track.title) ||
          fuzzyMatch(trimmed, track.title_short)),
    );

    if (matchedTrack) {
      const newFoundIds = new Set(foundTrackIds);
      newFoundIds.add(matchedTrack.id);
      setFoundTrackIds(newFoundIds);

      const newAnswer: TrackAnswer = {
        userInput: trimmed,
        isCorrect: true,
        matchedTrackId: matchedTrack.id,
        timestamp: new Date().toISOString(),
      };
      const newAnswers = [...validatedAnswers, newAnswer];
      setValidatedAnswers(newAnswers);
      setCurrentInput("");
      showFeedback("correct", `✓ ${matchedTrack.title}`);

      if (newFoundIds.size === currentAlbum.tracks.length) {
        void submitAnswers(newFoundIds, newAnswers);
      }
    } else {
      setCurrentInput("");
      triggerError();
      showFeedback("wrong", "Essaie encore !");
    }

    isProcessingAnswerRef.current = false;
  }, [
    currentInput,
    currentAlbum,
    foundTrackIds,
    validatedAnswers,
    showFeedback,
    submitAnswers,
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
          onPress: () => {
            void submitAnswers();
          },
        },
      ],
    );
  }, [submitAnswers]);

  const resetGame = useCallback(() => {
    if (gameId) {
      void deleteGameState(gameId);
    }
    setGameState("artistSearch");
    setCurrentAlbum(null);
    setCandidateAlbums([]);
    setSelectedArtist(null);
    setSearchQuery("");
    setCurrentInput("");
    setFoundTrackIds(new Set());
    setTimeRemaining(GAME_DURATION);
    setIsTimerRunning(false);
    setValidatedAnswers([]);
    setSessionId(null);
    setAnswerFeedback(null);
  }, [gameId]);

  const backToArtistSearch = useCallback(() => {
    setGameState("artistSearch");
  }, []);

  return {
    gameState,
    searchQuery,
    loadingAlbum,
    candidateAlbums,
    selectedArtist,
    currentAlbum,
    currentInput,
    foundTrackIds,
    answerFeedback,
    timeRemaining,
    sessionId,
    sessionError,
    shakeAnimation,
    borderOpacity,
    errorAnimationsEnabled,
    setSearchQuery,
    setCurrentInput,
    handleSelectArtist,
    startGameWithAlbum,
    handleSubmitAnswer,
    handleAbandon,
    resetGame,
    backToArtistSearch,
    autoSave,
    formatTime,
  };
}
