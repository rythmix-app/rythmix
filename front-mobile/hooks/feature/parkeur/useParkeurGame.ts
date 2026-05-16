import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import {
  getMyActiveSession,
  updateGameSession,
} from "@/services/gameSessionService";
import {
  CuratedPlaylist,
  getCuratedPlaylists,
} from "@/services/curatedPlaylistService";
import { startParkeurSession } from "@/services/parkeurService";
import {
  deleteGameState,
  getGameState,
  saveGameState,
} from "@/services/gameStorageService";
import type {
  ParkeurAnswer,
  ParkeurGameData,
  ParkeurRound,
} from "@/types/gameSession";
import { compareAnswers } from "@/utils/parkeur";

export type ParkeurGameState =
  | "selection"
  | "loading"
  | "playing"
  | "reveal"
  | "result";

export type ParkeurMode = "pick" | "playlist" | "artist";

export interface ParkeurArtist {
  id: number;
  name: string;
  pictureUrl?: string;
}

interface ParkeurSaveState {
  selectedPlaylist: CuratedPlaylist | null;
  selectedArtist: ParkeurArtist | null;
  rounds: ParkeurRound[];
  currentRoundIndex: number;
  score: number;
  answers: ParkeurAnswer[];
  sessionId: string;
  startedAt: number;
}

export interface UseParkeurGameResult {
  gameState: ParkeurGameState;
  mode: ParkeurMode;
  setMode: (mode: ParkeurMode) => void;
  playlists: CuratedPlaylist[];
  loadingPlaylists: boolean;
  selectedPlaylist: CuratedPlaylist | null;
  selectedArtist: ParkeurArtist | null;
  sessionId: string | null;
  rounds: ParkeurRound[];
  currentRoundIndex: number;
  currentRound: ParkeurRound | null;
  score: number;
  answers: ParkeurAnswer[];
  lastAnswer: ParkeurAnswer | null;
  startWithPlaylist: (playlist: CuratedPlaylist) => Promise<void>;
  startWithArtist: (artist: ParkeurArtist) => Promise<void>;
  submitAnswer: (input: string) => void;
  skipRound: () => void;
  goToNextRound: () => void;
  resetGame: () => void;
  abandonGame: () => void;
  saveCurrentState: () => void;
  errorMessage: string | null;
}

export function useParkeurGame(): UseParkeurGameResult {
  const { gameId, resume } = useLocalSearchParams<{
    gameId: string;
    resume?: string;
  }>();
  const user = useAuthStore((state) => state.user);

  const [gameState, setGameState] = useState<ParkeurGameState>("selection");
  const [mode, setMode] = useState<ParkeurMode>("pick");
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<CuratedPlaylist | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<ParkeurArtist | null>(
    null,
  );
  const [rounds, setRounds] = useState<ParkeurRound[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<ParkeurAnswer[]>([]);
  const [lastAnswer, setLastAnswer] = useState<ParkeurAnswer | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const startedAtRef = useRef<number>(0);
  const roundStartedAtRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingPlaylists(true);
      try {
        const data = await getCuratedPlaylists();
        if (!cancelled) setPlaylists(data);
      } catch (error) {
        console.error("[Parkeur] Failed to load playlists:", error);
        if (!cancelled) setErrorMessage("Impossible de charger les playlists.");
      } finally {
        if (!cancelled) setLoadingPlaylists(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    const restore = async () => {
      if (resume !== "true") {
        await deleteGameState(gameId);
        return;
      }
      const saved = await getGameState<ParkeurSaveState>(gameId);
      if (!cancelled && saved) {
        setSelectedPlaylist(saved.selectedPlaylist);
        setSelectedArtist(saved.selectedArtist);
        setRounds(saved.rounds);
        setCurrentRoundIndex(saved.currentRoundIndex);
        setScore(saved.score);
        setAnswers(saved.answers);
        setSessionId(saved.sessionId);
        setLastAnswer(null);
        startedAtRef.current = saved.startedAt;
        roundStartedAtRef.current = Date.now();
        setGameState("playing");
        return;
      }
      // No local save (reinstall, different device, AsyncStorage cleared) —
      // hydrate from the server-side active session instead.
      try {
        const session = await getMyActiveSession(Number(gameId));
        if (cancelled || !session) return;
        const data = session.gameData as Partial<ParkeurGameData>;
        const serverRounds = data.rounds ?? [];
        if (serverRounds.length === 0) return;
        const playlist = data.playlistName
          ? ({
              id: data.playlistId ?? 0,
              name: data.playlistName,
              deezerPlaylistId: 0,
              genreLabel: "",
              coverUrl: null,
              trackCount: 0,
              createdAt: "",
              updatedAt: "",
            } as CuratedPlaylist)
          : null;
        const artist: ParkeurArtist | null = data.artistName
          ? { id: data.artistId ?? 0, name: data.artistName }
          : null;
        const startedAt = data.startedAt
          ? new Date(data.startedAt).getTime()
          : Date.now();
        const restoredRound = Math.min(
          Math.max(data.currentRound ?? 0, 0),
          Math.max(serverRounds.length - 1, 0),
        );
        setSelectedPlaylist(playlist);
        setSelectedArtist(artist);
        setRounds(serverRounds);
        setCurrentRoundIndex(restoredRound);
        setScore(data.score ?? 0);
        setAnswers(data.answers ?? []);
        setSessionId(session.id);
        setLastAnswer(null);
        startedAtRef.current = startedAt;
        roundStartedAtRef.current = Date.now();
        setGameState("playing");
      } catch (error) {
        console.warn("[Parkeur] Failed to hydrate from server:", error);
      }
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, [gameId, resume]);

  const persistState = useCallback(
    (overrides: Partial<ParkeurSaveState> = {}) => {
      if (!gameId || !sessionId) return;
      if (!selectedPlaylist && !selectedArtist) return;
      const state: ParkeurSaveState = {
        selectedPlaylist,
        selectedArtist,
        rounds,
        currentRoundIndex,
        score,
        answers,
        sessionId,
        startedAt: startedAtRef.current,
        ...overrides,
      };
      void saveGameState(gameId, state);
    },
    [
      gameId,
      sessionId,
      selectedPlaylist,
      selectedArtist,
      rounds,
      currentRoundIndex,
      score,
      answers,
    ],
  );

  const launchSession = useCallback(
    async (
      input: { playlistId: number } | { artistId: number },
      onSuccess: (
        result: Awaited<ReturnType<typeof startParkeurSession>>,
        startedAt: number,
      ) => Promise<void>,
    ) => {
      if (!user || !gameId) return;
      setGameState("loading");
      setErrorMessage(null);
      try {
        const result = await startParkeurSession(input);
        const startedAt = Date.now();
        setRounds(result.rounds);
        setSessionId(result.session.id);
        setCurrentRoundIndex(0);
        setScore(0);
        setAnswers([]);
        setLastAnswer(null);
        startedAtRef.current = startedAt;
        roundStartedAtRef.current = startedAt;
        setGameState("playing");
        await onSuccess(result, startedAt);
      } catch (error: any) {
        console.error("[Parkeur] startParkeurSession failed:", error);
        const message =
          error?.message ??
          "Impossible de démarrer la partie. Essaie une autre source.";
        setErrorMessage(message);
        setGameState("selection");
      }
    },
    [user, gameId],
  );

  const startWithPlaylist = useCallback(
    async (playlist: CuratedPlaylist) => {
      setSelectedPlaylist(playlist);
      setSelectedArtist(null);
      await launchSession(
        { playlistId: playlist.id },
        async (result, startedAt) => {
          if (!gameId) return;
          await saveGameState<ParkeurSaveState>(gameId, {
            selectedPlaylist: playlist,
            selectedArtist: null,
            rounds: result.rounds,
            currentRoundIndex: 0,
            score: 0,
            answers: [],
            sessionId: result.session.id,
            startedAt,
          });
        },
      );
    },
    [gameId, launchSession],
  );

  const startWithArtist = useCallback(
    async (artist: ParkeurArtist) => {
      setSelectedArtist(artist);
      setSelectedPlaylist(null);
      await launchSession(
        { artistId: artist.id },
        async (result, startedAt) => {
          if (!gameId) return;
          await saveGameState<ParkeurSaveState>(gameId, {
            selectedPlaylist: null,
            selectedArtist: artist,
            rounds: result.rounds,
            currentRoundIndex: 0,
            score: 0,
            answers: [],
            sessionId: result.session.id,
            startedAt,
          });
        },
      );
    },
    [gameId, launchSession],
  );

  const finishGame = useCallback(
    (finalAnswers: ParkeurAnswer[], finalScore: number) => {
      if (gameId) void deleteGameState(gameId);
      if (!sessionId) {
        setGameState("result");
        return;
      }
      const startedAt = startedAtRef.current || Date.now();
      const completedAt = Date.now();
      const timeElapsed = Math.round((completedAt - startedAt) / 1000);
      const finalGameData: Partial<ParkeurGameData> = {
        score: finalScore,
        answers: finalAnswers,
        completedAt: new Date(completedAt).toISOString(),
        timeElapsed,
        currentRound: finalAnswers.length,
      };
      updateGameSession(sessionId, {
        status: "completed",
        gameData: finalGameData as Record<string, unknown>,
      }).catch((e) =>
        console.warn("[Parkeur] Final session update failed:", e),
      );
      setGameState("result");
    },
    [sessionId, gameId],
  );

  const recordAnswer = useCallback(
    (input: string, correct: boolean) => {
      const round = rounds[currentRoundIndex];
      if (!round) return;
      const durationMs = Date.now() - roundStartedAtRef.current;
      const answer: ParkeurAnswer = {
        correct,
        durationMs,
        userInput: input,
        expected: round.answerLine,
      };
      const nextAnswers = [...answers, answer];
      const nextScore = score + (correct ? 1 : 0);
      setAnswers(nextAnswers);
      setScore(nextScore);
      setLastAnswer(answer);
      setGameState("reveal");

      persistState({ answers: nextAnswers, score: nextScore });

      if (sessionId) {
        const partialUpdate: Partial<ParkeurGameData> = {
          score: nextScore,
          answers: nextAnswers,
          currentRound: currentRoundIndex + 1,
        };
        updateGameSession(sessionId, {
          gameData: partialUpdate as Record<string, unknown>,
        }).catch((e) => console.warn("[Parkeur] Session update failed:", e));
      }
    },
    [rounds, currentRoundIndex, answers, score, sessionId, persistState],
  );

  const submitAnswer = useCallback(
    (input: string) => {
      if (gameState !== "playing") return;
      const round = rounds[currentRoundIndex];
      if (!round) return;
      const correct = compareAnswers(input, round.answerLine);
      recordAnswer(input, correct);
    },
    [gameState, rounds, currentRoundIndex, recordAnswer],
  );

  const skipRound = useCallback(() => {
    if (gameState !== "playing") return;
    recordAnswer("", false);
  }, [gameState, recordAnswer]);

  const goToNextRound = useCallback(() => {
    if (gameState !== "reveal") return;
    const isLast = currentRoundIndex + 1 >= rounds.length;
    if (isLast) {
      finishGame(answers, score);
      return;
    }
    const nextIndex = currentRoundIndex + 1;
    setCurrentRoundIndex(nextIndex);
    setLastAnswer(null);
    roundStartedAtRef.current = Date.now();
    setGameState("playing");
    persistState({ currentRoundIndex: nextIndex });
  }, [
    gameState,
    currentRoundIndex,
    rounds.length,
    answers,
    score,
    finishGame,
    persistState,
  ]);

  const resetGame = useCallback(() => {
    if (gameId) void deleteGameState(gameId);
    setGameState("selection");
    setMode("pick");
    setSelectedPlaylist(null);
    setSelectedArtist(null);
    setRounds([]);
    setCurrentRoundIndex(0);
    setScore(0);
    setAnswers([]);
    setLastAnswer(null);
    setSessionId(null);
    setErrorMessage(null);
  }, [gameId]);

  const abandonGame = useCallback(() => {
    finishGame(answers, score);
  }, [answers, score, finishGame]);

  return {
    gameState,
    mode,
    setMode,
    playlists,
    loadingPlaylists,
    selectedPlaylist,
    selectedArtist,
    sessionId,
    rounds,
    currentRoundIndex,
    currentRound: rounds[currentRoundIndex] ?? null,
    score,
    answers,
    lastAnswer,
    startWithPlaylist,
    startWithArtist,
    submitAnswer,
    skipRound,
    goToNextRound,
    resetGame,
    abandonGame,
    saveCurrentState: persistState,
    errorMessage,
  };
}
