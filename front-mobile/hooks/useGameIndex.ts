import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { getAllGames } from "@/services/gameService";
import { hasGameState } from "@/services/gameStorageService";
import {
  getMyActiveSession,
  getMyGameHistory,
  updateGameSession,
} from "@/services/gameSessionService";
import { GameSession } from "@/types/gameSession";
import * as Haptics from "expo-haptics";

interface UseGameIndexOptions {
  gameName: string;
  gamePath: string;
  /**
   * When true, an active server session is treated as resumable even if no local
   * AsyncStorage save exists. Set this for games whose round data lives on the
   * server (e.g. Parkeur) so reinstalls/cross-device users don't lose progress.
   */
  canResumeFromServer?: boolean;
}

export function useGameIndex({
  gameName,
  gamePath,
  canResumeFromServer = false,
}: UseGameIndexOptions) {
  const [gameId, setGameId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [hasPlayedBefore, setHasPlayedBefore] = useState<boolean | null>(null);
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [isResumeModalVisible, setIsResumeModalVisible] = useState(false);
  const [isRulesModalVisible, setIsRulesModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadGameId();
    }, []),
  );

  const loadGameId = async () => {
    try {
      const games = await getAllGames();
      const game = games.find(
        (g) => g.name.toLowerCase() === gameName.toLowerCase(),
      );
      if (game) {
        setGameId(game.id);
        const [savedStateExists, history, activeServerSession] =
          await Promise.all([
            hasGameState(game.id.toString()),
            getMyGameHistory(game.id, { limit: 1 }),
            canResumeFromServer
              ? getMyActiveSession(game.id)
              : Promise.resolve(null),
          ]);
        setHasSavedGame(savedStateExists);
        setHasPlayedBefore(history.meta.total > 0);
        if (activeServerSession && activeServerSession.status === "active") {
          setActiveSession(activeServerSession);
        } else {
          setActiveSession(null);
        }
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(`Failed to load game ID for ${gameName}:`, err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const navigateToGame = (resume: boolean) => {
    if (gameId) {
      router.push({
        pathname: gamePath as any,
        params: {
          gameId: gameId.toString(),
          resume: resume.toString(),
        },
      });
    }
  };

  const handleStartGame = async (resume: boolean = false) => {
    if (!gameId) return;

    if (resume) {
      Haptics.selectionAsync().catch(() => {});
      navigateToGame(true);
      return;
    }

    setLoading(true);
    try {
      const session = await getMyActiveSession(gameId);

      if (session && session.status === "active") {
        const localSaveExists = await hasGameState(gameId.toString());
        if (localSaveExists || canResumeFromServer) {
          setActiveSession(session);
          setIsResumeModalVisible(true);
        } else {
          try {
            await updateGameSession(session.id, { status: "canceled" });
          } catch (e) {
            console.error("Failed to cancel orphaned session:", e);
          }
          navigateToGame(false);
        }
      } else {
        navigateToGame(false);
      }
    } catch (err) {
      console.error("Error checking active session:", err);
      navigateToGame(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResume = () => {
    setIsResumeModalVisible(false);
    navigateToGame(true);
  };

  const handleStartNewGame = async () => {
    setIsResumeModalVisible(false);
    if (activeSession) {
      setLoading(true);
      try {
        await updateGameSession(activeSession.id, { status: "canceled" });
      } catch (e) {
        console.error("Failed to cancel session:", e);
      } finally {
        setLoading(false);
      }
    }
    navigateToGame(false);
  };

  return {
    gameId,
    loading,
    error,
    hasSavedGame,
    hasPlayedBefore,
    activeSession,
    isResumeModalVisible,
    setIsResumeModalVisible,
    isRulesModalVisible,
    setIsRulesModalVisible,
    handleStartGame,
    handleConfirmResume,
    handleStartNewGame,
  };
}
