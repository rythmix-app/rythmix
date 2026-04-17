import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
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
    try {
      const response = await deezerAPI.getTopArtists(50);
      const filtered = response.data.filter(
        (a) => a.picture_xl && a.nb_fan !== undefined && a.nb_fan > 0
      );
      
      artistPool.current = filtered;
      
      if (filtered.length < 2) throw new Error("Pas assez d'artistes trouvés");
      
      const a = filtered[0];
      const b = filtered[1];
      
      setArtistA(a);
      setArtistB(b);
      usedArtistIds.current.add(a.id);
      usedArtistIds.current.add(b.id);
      currentArtistIndex.current = 1;
      
      // Créer la session
      const session = await createGameSession({
        gameId: Number(gameId),
        status: "active",
        gameData: {
          totalRounds: 0,
          streak: 0,
          bestStreak: 0,
          rounds: [],
          startedAt: new Date().toISOString(),
          completedAt: null,
        } as HigherOrLowerGameData,
      });
      
      setSessionId(session.id);
      setGameState("playing");
    } catch (error) {
      console.error("Error loading artists:", error);
      router.back();
    }
  }, [gameId]);

  useEffect(() => {
    loadInitialArtists();
  }, [loadInitialArtists]);

  // Récupérer un nouvel artiste challenger
  const getNextArtist = useCallback(async () => {
    currentArtistIndex.current += 1;
    
    // Si on arrive au bout du pool, on en recharge
    if (currentArtistIndex.current >= artistPool.current.length - 5) {
      try {
        const response = await deezerAPI.getTopArtists(50, artistPool.current.length);
        const filtered = response.data.filter(
          (a) => a.picture_xl && a.nb_fan !== undefined && !usedArtistIds.current.has(a.id)
        );
        artistPool.current = [...artistPool.current, ...filtered];
      } catch (e) {
        console.warn("Failed to fetch more artists", e);
      }
    }
    
    return artistPool.current[currentArtistIndex.current];
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
      
      <View style={styles.streakContainer}>
        <ThemedText style={styles.streakText}>SÉRIE : {streak}</ThemedText>
      </View>

      <View style={styles.gameArea}>
        {/* Artiste A (Haut) */}
        <Animated.View style={[styles.artistCard, styles.cardTop, cardAStyle]}>
          <Image source={{ uri: artistA?.picture_xl }} style={styles.artistImage} />
          <View style={styles.overlay} />
          <View style={styles.artistInfo}>
            <ThemedText type="title" style={styles.artistName}>{artistA?.name}</ThemedText>
            <ThemedText style={styles.fansText}>a</ThemedText>
            <ThemedText style={styles.fansCount}>{formatNumber(artistA?.nb_fan || 0)}</ThemedText>
            <ThemedText style={styles.fansText}>auditeurs mensuels</ThemedText>
          </View>
        </Animated.View>

        {/* Badge VS */}
        <Animated.View style={[styles.vsBadge, vsStyle]}>
          <ThemedText style={styles.vsText}>VS</ThemedText>
        </Animated.View>

        {/* Artiste B (Bas) */}
        <Animated.View style={[styles.artistCard, styles.cardBottom, cardBStyle]}>
          <Image source={{ uri: artistB?.picture_xl }} style={styles.artistImage} />
          <View style={[
            styles.overlay, 
            gameState === "wrong" && styles.overlayWrong,
            isCorrect === true && styles.overlayCorrect
          ]} />
          <View style={styles.artistInfo}>
            <ThemedText type="title" style={styles.artistName}>{artistB?.name}</ThemedText>
            <ThemedText style={styles.fansText}>a</ThemedText>
            
            <Animated.View style={revealStyle}>
              <ThemedText style={styles.fansCount}>{formatNumber(artistB?.nb_fan || 0)}</ThemedText>
            </Animated.View>
            
            {gameState === "playing" && (
              <ThemedText style={styles.fansCountHidden}>???</ThemedText>
            )}
            
            <ThemedText style={styles.fansText}>auditeurs mensuels</ThemedText>

            {gameState === "playing" && (
              <View style={styles.controls}>
                <TouchableOpacity 
                  style={styles.guessButton} 
                  onPress={() => handleGuess("higher")}
                >
                  <MaterialIcons name="trending-up" size={32} color="white" />
                  <ThemedText style={styles.guessButtonText}>PLUS</ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.guessButton, styles.lowerButton]} 
                  onPress={() => handleGuess("lower")}
                >
                  <MaterialIcons name="trending-down" size={32} color="white" />
                  <ThemedText style={styles.guessButtonText}>MOINS</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          {/* Feedback visuel lors de la révélation */}
          {isCorrect !== null && (
            <View style={styles.feedbackContainer}>
              <MaterialIcons 
                name={isCorrect ? "check-circle" : "cancel"} 
                size={80} 
                color={isCorrect ? "#4CAF50" : "#F44336"} 
              />
            </View>
          )}
        </Animated.View>
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
  },
  artistCard: {
    height: height / 2 - 40,
    width: width,
    position: "relative",
    overflow: "hidden",
  },
  cardTop: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  cardBottom: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  artistImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlayWrong: {
    backgroundColor: "rgba(244, 67, 54, 0.4)",
  },
  overlayCorrect: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
  },
  artistInfo: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 2,
  },
  artistName: {
    textAlign: "center",
    fontSize: 28,
    marginBottom: 5,
    color: "white",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  fansText: {
    color: "#CCC",
    fontSize: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  fansCount: {
    color: Colors.primary.survol,
    fontSize: 42,
    fontWeight: "900",
    marginVertical: 10,
  },
  fansCountHidden: {
    color: "white",
    fontSize: 42,
    fontWeight: "900",
    marginVertical: 10,
  },
  vsBadge: {
    position: "absolute",
    top: height / 2 - 80,
    left: width / 2 - 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  vsText: {
    color: "black",
    fontWeight: "bold",
    fontSize: 20,
  },
  controls: {
    flexDirection: "row",
    marginTop: 30,
    gap: 20,
  },
  guessButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "white",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  lowerButton: {
    // Optionnel: style différent pour Moins
  },
  guessButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  streakContainer: {
    position: "absolute",
    top: 100,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 20,
  },
  streakText: {
    color: Colors.primary.survol,
    fontWeight: "bold",
    fontSize: 14,
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
