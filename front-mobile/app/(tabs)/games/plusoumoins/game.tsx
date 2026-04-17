import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import Header from "@/components/Header";
import Button from "@/components/Button";
import GameLayout from "@/components/GameLayout";
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
import { HigherOrLowerGameData, HigherOrLowerRound } from "@/types/gameSession";

type GameMode = "artist" | "album" | null;
type GameState =
  | "selection"
  | "loading"
  | "playing"
  | "reveal"
  | "wrong"
  | "result";

interface TargetData {
  id: number;
  name: string;
  score: number;
  image: string;
}

interface PlusOuMoinsSaveState {
  mode: GameMode;
  gameState: GameState;
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

export default function HigherOrLowerGameScreen() {
  const { gameId, resume } = useLocalSearchParams<{
    gameId: string;
    resume?: string;
  }>();
  const user = useAuthStore((state) => state.user);

  const [mode, setMode] = useState<GameMode>(null);
  const [gameState, setGameState] = useState<GameState>("selection");
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

  const loadInitialData = useCallback(
    async (selectedMode: GameMode) => {
      if (!selectedMode || !user) return;
      setGameState("loading");
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

  const finishGame = (
    finalRounds: HigherOrLowerRound[],
    finalStreak: number,
  ) => {
    const currentBest = mode === "artist" ? bestStreakArtist : bestStreakAlbum;
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
  };

  const handleGuess = async (guess: "higher" | "lower") => {
    if (gameState !== "playing" || !targetA || !targetB || !mode) return;
    setGameState("reveal");
    const correct =
      (guess === "higher" && targetB.score >= targetA.score) ||
      (guess === "lower" && targetB.score <= targetA.score);
    setIsCorrect(correct);
    revealOpacity.value = withTiming(1, { duration: 500 });

    const newRounds = [
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

  const formatNumber = (num: number) => num.toLocaleString("fr-FR");
  const revealStyle = useAnimatedStyle(() => ({
    opacity: revealOpacity.value,
  }));

  // RENDU SELECTION
  if (gameState === "selection") {
    return (
      <View style={styles.container}>
        <Header title="Plus ou moins" variant="withBack" />
        <View style={styles.selectionContent}>
          <ThemedText style={styles.selectionTitle}>
            CHOISISSEZ VOTRE DÉFI
          </ThemedText>
          <View style={styles.modeGrid}>
            <TouchableOpacity
              style={styles.modeCard}
              onPress={() => {
                setMode("artist");
                loadInitialData("artist");
              }}
            >
              <View style={styles.iconBubble}>
                <MaterialIcons name="person" size={40} color="#4FD1D9" />
              </View>
              <ThemedText style={styles.modeText}>Artistes</ThemedText>
              <ThemedText style={styles.modeDescription}>
                Auditeurs mensuels
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modeCard}
              onPress={() => {
                setMode("album");
                loadInitialData("album");
              }}
            >
              <View style={styles.iconBubble}>
                <MaterialIcons name="album" size={40} color="#4FD1D9" />
              </View>
              <ThemedText style={styles.modeText}>Albums</ThemedText>
              <ThemedText style={styles.modeDescription}>
                Nombre de fans
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // RENDU LOADING
  if (gameState === "loading") {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary.survol} />
        <ThemedText style={styles.loadingText}>
          Préparation du duel...
        </ThemedText>
      </View>
    );
  }

  // RENDU RESULTAT
  if (gameState === "result") {
    const currentBest = mode === "artist" ? bestStreakArtist : bestStreakAlbum;
    return (
      <View style={styles.container}>
        <Header title="Résultat" variant="withBack" />
        <View style={styles.resultContent}>
          <MaterialIcons
            name="emoji-events"
            size={100}
            color={Colors.primary.survol}
          />
          <ThemedText type="title" style={styles.resultTitle}>
            Partie terminée !
          </ThemedText>
          <View style={styles.scoreBoard}>
            <View style={styles.scoreItem}>
              <ThemedText style={styles.scoreLabel}>SÉRIE ACTUELLE</ThemedText>
              <ThemedText style={styles.scoreValue}>{streak}</ThemedText>
            </View>
            <View style={styles.scoreItem}>
              <ThemedText style={styles.scoreLabel}>MEILLEURE SÉRIE</ThemedText>
              <ThemedText style={styles.scoreValue}>{currentBest}</ThemedText>
            </View>
          </View>
          <Button
            title="Rejouer"
            onPress={() => {
              setGameState("selection");
              setMode(null);
              setStreak(0);
              setRounds([]);
              setIsCorrect(null);
              setSessionId(null);
            }}
            style={styles.replayButton}
          />
          <Button
            title="Quitter"
            variant="outline"
            onPress={() => router.back()}
            style={styles.exitButton}
          />
        </View>
      </View>
    );
  }

  // RENDU JEU
  return (
    <GameLayout title="Plus ou moins" sessionId={sessionId} onSave={autoSave}>
      <View style={styles.container}>
        <View style={styles.gameHeader}>
          <View style={styles.levelInfo}>
            <View style={styles.levelBadge}>
              <ThemedText style={styles.levelText}>Série : {streak}</ThemedText>
            </View>
            <ThemedText style={styles.hintText}>
              {mode === "artist"
                ? "Qui a le plus d'auditeurs ?"
                : "Lequel a le plus d'écoutes ?"}
            </ThemedText>
            <TouchableOpacity
              onPress={() =>
                Alert.alert("Abandonner ?", "Voulez-vous arrêter ?", [
                  { text: "Non", style: "cancel" },
                  { text: "Oui", onPress: () => finishGame(rounds, streak) },
                ])
              }
            >
              <MaterialIcons name="close" size={24} color="#ff6b6b" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.gameArea}>
          <TouchableOpacity
            style={styles.clickableArea}
            activeOpacity={0.8}
            onPress={() => handleGuess("lower")}
            disabled={gameState !== "playing"}
          >
            <View style={styles.stylizedCard}>
              <View style={styles.profileBubble}>
                <Image
                  source={{ uri: targetA?.image }}
                  style={styles.bubbleImage}
                />
              </View>
              <ThemedText style={styles.artistName}>{targetA?.name}</ThemedText>
              <View style={styles.scoreContainer}>
                <ThemedText style={styles.fansCount}>
                  {formatNumber(targetA?.score || 0)}
                </ThemedText>
              </View>
              <ThemedText style={styles.fansLabel}>
                {mode === "artist" ? "auditeurs mensuels" : "fans"}
              </ThemedText>
            </View>
          </TouchableOpacity>
          <View style={styles.vsContainer}>
            <View style={styles.vsLine} />
            <View style={styles.vsCircle}>
              <ThemedText style={styles.vsText}>VS</ThemedText>
            </View>
            <View style={styles.vsLine} />
          </View>
          <TouchableOpacity
            style={styles.clickableArea}
            activeOpacity={0.8}
            onPress={() => handleGuess("higher")}
            disabled={gameState !== "playing"}
          >
            <View style={styles.stylizedCard}>
              <View style={styles.profileBubble}>
                <Image
                  source={{ uri: targetB?.image }}
                  style={styles.bubbleImage}
                />
                {isCorrect !== null && (
                  <View style={styles.feedbackOverlay}>
                    <MaterialIcons
                      name={isCorrect ? "check-circle" : "cancel"}
                      size={60}
                      color={isCorrect ? "#4CAF50" : "#F44336"}
                    />
                  </View>
                )}
              </View>
              <ThemedText style={styles.artistName}>{targetB?.name}</ThemedText>
              <View style={styles.scoreContainer}>
                {gameState === "playing" ? (
                  <ThemedText style={styles.fansCountHidden}>???</ThemedText>
                ) : (
                  <Animated.View style={revealStyle}>
                    <ThemedText style={styles.fansCount}>
                      {formatNumber(targetB?.score || 0)}
                    </ThemedText>
                  </Animated.View>
                )}
              </View>
              <ThemedText style={styles.fansLabel}>
                {mode === "artist" ? "auditeurs mensuels" : "fans"}
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </GameLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary.fondPremier },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primary.fondPremier,
  },
  selectionContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  selectionTitle: {
    fontSize: 22,
    marginBottom: 50,
    color: "white",
    fontFamily: "Bold",
    letterSpacing: 2,
    opacity: 0.9,
    textAlign: "center",
  },
  modeGrid: { flexDirection: "row", gap: 15, width: "100%" },
  modeCard: {
    flex: 1,
    height: 210,
    backgroundColor: "#1A2B2C",
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconBubble: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(79, 209, 217, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(79, 209, 217, 0.2)",
  },
  modeText: {
    color: "white",
    fontSize: 20,
    fontFamily: "Author-Bold",
    marginBottom: 6,
  },
  modeDescription: {
    color: "#667A7B",
    fontSize: 9,
    textAlign: "center",
    paddingHorizontal: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  gameHeader: { padding: 20, backgroundColor: "rgba(0, 0, 0, 0.5)", gap: 12 },
  levelInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  levelBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  levelText: { color: "white", fontSize: 14, fontWeight: "bold" },
  hintText: { color: "white", fontSize: 18, fontWeight: "bold" },
  gameArea: { flex: 1, paddingVertical: 5 },
  clickableArea: { flex: 1, paddingHorizontal: 20, paddingVertical: 5 },
  stylizedCard: {
    flex: 1,
    backgroundColor: "#1A2B2C",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  profileBubble: {
    width: 90,
    height: 100,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "rgba(79, 209, 217, 0.3)",
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "#2A3B3C",
    position: "relative",
  },
  bubbleImage: { width: "100%", height: "100%" },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  artistName: {
    color: "white",
    fontSize: 22,
    fontFamily: "Author-Bold",
    textAlign: "center",
    marginBottom: 2,
  },
  fansCount: {
    color: "#4FD1D9",
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    paddingTop: 8,
    lineHeight: 36,
  },
  fansCountHidden: {
    color: "white",
    fontSize: 30,
    fontWeight: "bold",
    opacity: 0.2,
    paddingTop: 8,
  },
  fansLabel: {
    color: "#667A7B",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  scoreContainer: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  vsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 24,
    paddingHorizontal: 40,
  },
  vsLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  vsCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary.fondPremier,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  vsText: { color: "white", fontSize: 12, fontFamily: "Bold", opacity: 0.8 },
  loadingText: { color: "white", marginTop: 15, fontSize: 16 },
  resultContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  resultTitle: {
    fontSize: 32,
    marginTop: 10,
    marginBottom: 40,
    textAlign: "center",
    color: "white",
    fontFamily: "Bold",
  },
  scoreBoard: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    marginBottom: 50,
    paddingVertical: 10,
  },
  scoreItem: { alignItems: "center", paddingVertical: 10 },
  scoreLabel: {
    color: "#999",
    fontSize: 12,
    marginBottom: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "bold",
    color: "white",
    lineHeight: 54,
    paddingTop: 10,
  },
  replayButton: { width: "100%", marginBottom: 15 },
  exitButton: { width: "100%" },
});
