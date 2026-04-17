import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import Header from "@/components/Header";
import Button from "@/components/Button";
import { deezerAPI, DeezerArtist } from "@/services/deezer-api";
import {
  createGameSession,
  updateGameSession,
} from "@/services/gameSessionService";
import { HigherOrLowerGameData, HigherOrLowerRound } from "@/types/gameSession";

const { width, height } = Dimensions.get("window");

type GameState = "loading" | "playing" | "reveal" | "wrong" | "result";

export default function HigherOrLowerGameScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  
  // États du jeu
  const [gameState, setGameState] = useState<GameState>("loading");
  const [artists, setArtists] = useState<DeezerArtist[]>([]);
  const [artistA, setArtistA] = useState<DeezerArtist | null>(null);
  const [artistB, setArtistB] = useState<DeezerArtist | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rounds, setRounds] = useState<HigherOrLowerRound[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  
  // Refs pour la pagination et éviter les doublons
  const usedArtistIds = useRef<Set<number>>(new Set());
  const artistPool = useRef<DeezerArtist[]>([]);
  const currentArtistIndex = useRef(0);

  // Valeurs animées
  const cardATranslateY = useSharedValue(0);
  const cardBTranslateY = useSharedValue(0);
  const revealOpacity = useSharedValue(0);
  const vsScale = useSharedValue(1);

  // Charger les artistes initiaux
  const loadInitialArtists = useCallback(async () => {
    console.log("[HigherOrLower] Initializing game with gameId:", gameId);
    
    if (!gameId || isNaN(Number(gameId))) {
      console.error("[HigherOrLower] Invalid gameId:", gameId);
      Alert.alert("Erreur", "L'identifiant du jeu est manquant.");
      router.back();
      return;
    }

    try {
      setGameState("loading");
      // Étape 1: Récupérer le Top Artistes (allégé)
      const response = await deezerAPI.getTopArtists(50);
      
      if (!response || !response.data || response.data.length < 2) {
        throw new Error("Impossible de récupérer le classement des artistes.");
      }

      console.log("[HigherOrLower] Top artists fetched, enriching data...");

      // Étape 2: Enrichir les 5 premiers pour démarrer vite (en parallèle)
      const firstBatch = response.data.slice(0, 10);
      const enrichedArtists = await Promise.all(
        firstBatch.map(async (a) => {
          try {
            return await deezerAPI.getArtist(a.id);
          } catch (e) {
            console.warn(`Failed to enrich artist ${a.name}`, e);
            return null;
          }
        })
      );

      const filtered = enrichedArtists.filter(
        (a): a is DeezerArtist => a !== null && !!a.picture_xl && !!a.nb_fan
      );

      if (filtered.length < 2) {
        throw new Error("Pas assez d'artistes avec des données complètes trouvés.");
      }
      
      artistPool.current = filtered;
      const a = filtered[0];
      const b = filtered[1];
      
      setArtistA(a);
      setArtistB(b);
      usedArtistIds.current.add(a.id);
      usedArtistIds.current.add(b.id);
      currentArtistIndex.current = 1;
      
      console.log("[HigherOrLower] Ready to play with artists:", a.name, "(", a.nb_fan, ") and", b.name, "(", b.nb_fan, ")");

      // Créer la session
      try {
        const initialGameData: HigherOrLowerGameData = {
          totalRounds: 0,
          streak: 0,
          bestStreak: 0,
          rounds: [],
          startedAt: new Date().toISOString(),
          completedAt: null,
        };

        const session = await createGameSession({
          gameId: Number(gameId),
          status: "active",
          gameData: initialGameData as unknown as Record<string, unknown>,
        });
        setSessionId(session.id);
      } catch (sessionError) {
        console.warn("[HigherOrLower] Session creation failed:", sessionError);
      }
      
      setGameState("playing");
      
      // Charger le reste en arrière-plan (non bloquant)
      loadMoreArtistsInBackground(response.data.slice(10));
    } catch (error) {
      console.error("[HigherOrLower] Critical initialization error:", error);
      Alert.alert(
        "Erreur de chargement",
        error instanceof Error ? error.message : "Une erreur inconnue est survenue"
      );
      router.back();
    }
  }, [gameId]);

  // Fonction utilitaire pour charger plus d'artistes en arrière-plan
  const loadMoreArtistsInBackground = async (remaining: DeezerArtist[]) => {
    for (let i = 0; i < remaining.length; i++) {
      try {
        const fullArtist = await deezerAPI.getArtist(remaining[i].id);
        if (fullArtist && fullArtist.picture_xl && fullArtist.nb_fan) {
          artistPool.current = [...artistPool.current, fullArtist];
        }
      } catch (e) {
        // Ignorer silencieusement les échecs individuels
      }
    }
    console.log("[HigherOrLower] Artist pool enriched, total:", artistPool.current.length);
  };

  useEffect(() => {
    loadInitialArtists();
  }, [loadInitialArtists]);

  // Récupérer un nouvel artiste challenger
  const getNextArtist = useCallback(async () => {
    currentArtistIndex.current += 1;
    
    // Si on arrive au bout du pool enrichi
    if (currentArtistIndex.current >= artistPool.current.length) {
      console.log("[HigherOrLower] End of enriched pool, waiting for more...");
      // Petit délai pour laisser le chargement d'arrière-plan travailler
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (currentArtistIndex.current >= artistPool.current.length) {
        // Si toujours rien, on en recharge un par défaut en urgence
        const topArtists = await deezerAPI.getTopArtists(50);
        // On cherche le premier qu'on n'a pas utilisé
        const unused = topArtists.data.find(a => !usedArtistIds.current.has(a.id));
        if (unused) {
          const full = await deezerAPI.getArtist(unused.id);
          artistPool.current = [...artistPool.current, full];
        } else {
           // En dernier recours, on reprend le pool initial filtré
           currentArtistIndex.current = 0;
        }
      }
    }
    
    const next = artistPool.current[currentArtistIndex.current];
    usedArtistIds.current.add(next.id);
    return next;
  }, []);

  const handleGuess = async (guess: "higher" | "lower") => {
    if (gameState !== "playing" || !artistA || !artistB) return;
    
    setGameState("reveal");
    
    const correct = 
      (guess === "higher" && artistB.nb_fan >= artistA.nb_fan) ||
      (guess === "lower" && artistB.nb_fan <= artistA.nb_fan);
    
    setIsCorrect(correct);
    
    // Animation de révélation
    revealOpacity.value = withTiming(1, { duration: 500 });
    vsScale.value = withSequence(
      withTiming(1.5, { duration: 200 }),
      withTiming(1, { duration: 200 })
    );

    const newRound: HigherOrLowerRound = {
      artistAId: artistA.id,
      artistAName: artistA.name,
      artistAFans: artistA.nb_fan,
      artistBId: artistB.id,
      artistBName: artistB.name,
      artistBFans: artistB.nb_fan,
      playerAnswer: guess,
      isCorrect: correct,
    };

    const newRounds = [...rounds, newRound];
    setRounds(newRounds);

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);

      // Mettre à jour la session
      if (sessionId) {
        updateGameSession(sessionId, {
          gameData: {
            totalRounds: newRounds.length,
            streak: newStreak,
            bestStreak: Math.max(bestStreak, newStreak),
            rounds: newRounds,
            startedAt: new Date().toISOString(),
            completedAt: null,
          } as HigherOrLowerGameData,
        }).catch(console.error);
      }

      // Passer au round suivant après un délai
      setTimeout(async () => {
        const nextArtist = await getNextArtist();
        
        // Animation de transition
        cardATranslateY.value = withTiming(-height, { duration: 500 });
        cardBTranslateY.value = withTiming(-height / 2, { duration: 500 }, (finished) => {
          if (finished) {
            runOnJS(prepareNextRound)(nextArtist);
          }
        });
      }, 1500);
    } else {
      setGameState("wrong");
      
      // Mettre à jour la session en complétée
      if (sessionId) {
        updateGameSession(sessionId, {
          status: "completed",
          gameData: {
            totalRounds: newRounds.length,
            streak: streak,
            bestStreak: bestStreak,
            rounds: newRounds,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          } as HigherOrLowerGameData,
        }).catch(console.error);
      }

      setTimeout(() => {
        setGameState("result");
      }, 2000);
    }
  };

  const prepareNextRound = (nextArtist: DeezerArtist) => {
    setArtistA(artistB);
    setArtistB(nextArtist);
    usedArtistIds.current.add(nextArtist.id);
    
    // Reset positions sans animation
    cardATranslateY.value = 0;
    cardBTranslateY.value = 0;
    revealOpacity.value = 0;
    setIsCorrect(null);
    setGameState("playing");
  };

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const cardAStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardATranslateY.value }],
  }));

  const cardBStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardBTranslateY.value }],
  }));

  const vsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: vsScale.value }],
  }));

  const revealStyle = useAnimatedStyle(() => ({
    opacity: revealOpacity.value,
  }));

  if (gameState === "loading") {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary.survol} />
      </View>
    );
  }

  if (gameState === "result") {
    return (
      <View style={styles.container}>
        <Header title="Résultat" variant="withBack" />
        <View style={styles.resultContent}>
          <MaterialIcons name="emoji-events" size={100} color={Colors.primary.survol} />
          <ThemedText type="title" style={styles.resultTitle}>Partie terminée !</ThemedText>
          
          <View style={styles.scoreBoard}>
            <View style={styles.scoreItem}>
              <ThemedText style={styles.scoreLabel}>SÉRIE ACTUELLE</ThemedText>
              <ThemedText style={styles.scoreValue}>{streak}</ThemedText>
            </View>
            <View style={styles.scoreItem}>
              <ThemedText style={styles.scoreLabel}>MEILLEUR SCORE</ThemedText>
              <ThemedText style={styles.scoreValue}>{bestStreak}</ThemedText>
            </View>
          </View>
          
          <Button 
            title="Rejouer" 
            onPress={() => {
              setStreak(0);
              setRounds([]);
              setIsCorrect(null);
              setGameState("loading");
              loadInitialArtists();
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

  return (
    <View style={styles.container}>
      <Header title="Plus ou moins" variant="withBack" />
      
      <View style={styles.gameArea}>
        {/* Zone Supérieure (Artiste A) - Clic si B < A (MOINS) */}
        <TouchableOpacity 
          style={styles.clickableArea} 
          activeOpacity={0.8}
          onPress={() => handleGuess("lower")}
          disabled={gameState !== "playing"}
        >
          <View style={styles.stylizedCard}>
            <View style={styles.profileBubble}>
              <Image source={{ uri: artistA?.picture_xl }} style={styles.bubbleImage} />
            </View>
            <ThemedText style={styles.artistName}>{artistA?.name}</ThemedText>
            <View style={styles.scoreContainer}>
              <ThemedText style={styles.fansCount}>{formatNumber(artistA?.nb_fan || 0)}</ThemedText>
            </View>
            <ThemedText style={styles.fansLabel}>auditeurs mensuels</ThemedText>
          </View>
        </TouchableOpacity>

        {/* Séparateur VS */}
        <View style={styles.vsContainer}>
          <View style={styles.vsLine} />
          <View style={styles.vsCircle}>
            <ThemedText style={styles.vsText}>VS</ThemedText>
          </View>
          <View style={styles.vsLine} />
        </View>

        {/* Zone Inférieure (Artiste B) - Clic si B > A (PLUS) */}
        <TouchableOpacity 
          style={styles.clickableArea} 
          activeOpacity={0.8}
          onPress={() => handleGuess("higher")}
          disabled={gameState !== "playing"}
        >
          <View style={styles.stylizedCard}>
            <View style={styles.profileBubble}>
              <Image source={{ uri: artistB?.picture_xl }} style={styles.bubbleImage} />
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
            <ThemedText style={styles.artistName}>{artistB?.name}</ThemedText>
            
            <View style={styles.scoreContainer}>
              {gameState === "playing" ? (
                <ThemedText style={styles.fansCountHidden}>???</ThemedText>
              ) : (
                <Animated.View style={revealStyle}>
                  <ThemedText style={styles.fansCount}>{formatNumber(artistB?.nb_fan || 0)}</ThemedText>
                </Animated.View>
              )}
            </View>
            <ThemedText style={styles.fansLabel}>auditeurs mensuels</ThemedText>
          </View>
        </TouchableOpacity>

        <View style={styles.streakBadge}>
          <ThemedText style={styles.streakText}>SÉRIE : {streak}</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primary.fondPremier,
  },
  gameArea: {
    flex: 1,
    paddingVertical: 10,
  },
  clickableArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  stylizedCard: {
    flex: 1,
    backgroundColor: "#1A2B2C",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  artistContent: {
    alignItems: "center",
    width: "100%",
  },
  profileBubble: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "rgba(79, 209, 217, 0.3)",
    overflow: "hidden",
    marginBottom: 10,
    backgroundColor: "#2A3B3C",
    position: "relative",
  },
  bubbleImage: {
    width: "100%",
    height: "100%",
  },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  artistName: {
    color: "white",
    fontSize: 24,
    fontFamily: "Author-Bold",
    textAlign: "center",
    marginBottom: 2,
  },
  fansCount: {
    color: "#4FD1D9",
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    paddingTop: 8, // Correction du rognage
    lineHeight: 38,
  },
  fansCountHidden: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    opacity: 0.3,
    paddingTop: 8,
  },
  fansLabel: {
    color: "#667A7B",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 0,
  },
  scoreContainer: {
    height: 44,
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
  vsLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
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
  vsText: {
    color: "white",
    fontSize: 12,
    fontFamily: "Bold",
    opacity: 0.8,
  },
  streakBadge: {
    position: "absolute",
    top: 25,
    right: 30,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(79, 209, 217, 0.2)",
    zIndex: 10,
  },
  streakText: {
    color: "#4FD1D9",
    fontSize: 10,
    fontWeight: "bold",
  },
  feedbackContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  resultContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  resultTitle: {
    fontSize: 32,
    marginTop: 20,
    marginBottom: 40,
    textAlign: "center",
  },
  scoreBoard: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    marginBottom: 50,
  },
  scoreItem: {
    alignItems: "center",
  },
  scoreLabel: {
    color: "#999",
    fontSize: 12,
    marginBottom: 10,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "white",
  },
  replayButton: {
    width: "100%",
    marginBottom: 15,
  },
  exitButton: {
    width: "100%",
  },
});
