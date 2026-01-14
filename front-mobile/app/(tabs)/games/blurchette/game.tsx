import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";
import { deezerAPI, DeezerGenre, DeezerTrack } from "@/services/deezer-api";
import { useAuthStore } from "@/stores/authStore";
import {
  createGameSession,
  updateGameSession,
} from "@/services/gameSessionService";
import { BlurchetteGameData } from "@/types/gameSession";
import { MaterialIcons } from "@expo/vector-icons";

type GameState = "genreSelection" | "playing" | "result";
type BlurLevel = 1 | 2 | 3 | 4 | 5;

interface GameTrack {
  track: DeezerTrack;
  isAlbum: boolean;
}

const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
};

export default function BlurchetteGameScreen() {
  const [gameState, setGameState] = useState<GameState>("genreSelection");
  const [genres, setGenres] = useState<DeezerGenre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<DeezerGenre | null>(null);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [loadingTrack, setLoadingTrack] = useState(false);

  const [currentTrack, setCurrentTrack] = useState<GameTrack | null>(null);

  const [blurLevel, setBlurLevel] = useState<BlurLevel>(1);
  const [answer, setAnswer] = useState("");
  const [hasAnswered, setHasAnswered] = useState(false);
  const [foundCorrect, setFoundCorrect] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [currentAttempts, setCurrentAttempts] = useState<
    {
      answer: string;
      isCorrect: boolean;
      blurLevel: number;
      timestamp: string;
    }[]
  >([]);

  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    loadGenres();
  }, []);

  const loadGenres = async () => {
    try {
      const response = await deezerAPI.getGenres();
      const filteredGenres = response.data.filter((g) => g.id !== 0);
      setGenres(filteredGenres);
    } catch (error) {
      console.error("Failed to load genres:", error);
      Alert.alert("Erreur", "Impossible de charger les genres musicaux");
    } finally {
      setLoadingGenres(false);
    }
  };

  const startGame = async (genre: DeezerGenre) => {
    setSelectedGenre(genre);
    setLoadingTrack(true);

    try {
      const response = await deezerAPI.getGenreTracks(genre.id, 50);

      if (!response.data || response.data.length === 0) {
        Alert.alert("Erreur", "Aucune musique trouvée pour ce genre");
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

      try {
        const gameData: BlurchetteGameData = {
          genre: {
            id: genre.id,
            name: genre.name,
          },
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
          players: {
            [user.id]: user.username,
          },
          gameData: gameData as unknown as Record<string, unknown>,
        });

        setSessionId(session.id);
        setCurrentAttempts([]);
      } catch (sessionErr) {
        console.error("Failed to create game session:", sessionErr);
        setSessionError(true);
        return;
      }

      setCurrentTrack(gameTrack);
      setBlurLevel(1);
      setAnswer("");
      setHasAnswered(false);
      setFoundCorrect(false);
      setGameState("playing");
    } catch (error) {
      console.error("Failed to load tracks:", error);
      Alert.alert("Erreur", "Impossible de charger les musiques");
    } finally {
      setLoadingTrack(false);
    }
  };

  const checkAnswer = (userAnswer: string, targetText: string): boolean => {
    const normalizedAnswer = normalizeString(userAnswer);
    const normalizedTarget = normalizeString(targetText);

    if (normalizedAnswer.length < 3) return false; // Réponse trop courte

    return (
      normalizedTarget.includes(normalizedAnswer) ||
      normalizedAnswer.includes(normalizedTarget)
    );
  };

  const submitAnswer = async () => {
    if (!answer.trim() || hasAnswered || !currentTrack) return;

    const albumTitle = currentTrack.track.album.title;
    const artistName = currentTrack.track.artist.name;
    const trackTitle = currentTrack.track.title;

    let isCorrect = false;

    if (currentTrack.isAlbum) {
      isCorrect = checkAnswer(answer, albumTitle);
    } else {
      isCorrect = checkAnswer(answer, trackTitle);
    }

    if (!isCorrect) {
      isCorrect = checkAnswer(answer, artistName);
    }

    const newAttempt = {
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
          currentBlurLevel: isCorrect ? blurLevel : Math.min(blurLevel + 1, 5),
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
        } else {
          await updateGameSession(sessionId, {
            gameData: updateData as unknown as Record<string, unknown>,
          });
        }
      } catch (err) {
        console.error("Failed to update session:", err);
        // Continuer le jeu même si la mise à jour échoue
      }
    }

    if (isCorrect) {
      setFoundCorrect(true);
      setHasAnswered(true);
      setGameState("result");
    } else {
      if (blurLevel < 5) {
        setBlurLevel((level) => (level + 1) as BlurLevel);
        Alert.alert("Incorrect", "Ce n'est pas la bonne réponse, continuez !");
        setAnswer("");
      } else {
        setFoundCorrect(false);
        setHasAnswered(true);
        setGameState("result");
      }
    }
  };

  const resetGame = () => {
    setGameState("genreSelection");
    setSelectedGenre(null);
    setCurrentTrack(null);
    setBlurLevel(1);
    setAnswer("");
    setHasAnswered(false);
    setFoundCorrect(false);
  };

  const getBlurRadius = (level: BlurLevel): number => {
    const blurValues = { 1: 50, 2: 35, 3: 20, 4: 10, 5: 2 };
    return blurValues[level];
  };

  if (sessionError) {
    return (
      <>
        <Header title="Blurchette" variant="withBack" />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={80} color="#ff6b6b" />
          <ThemedText type="title" style={styles.errorTitle}>
            Jeu indisponible
          </ThemedText>
          <ThemedText style={styles.errorText}>
            Impossible de démarrer la partie. Veuillez réessayer plus tard.
          </ThemedText>
          <Button
            title="Retour"
            onPress={() => router.back()}
            style={styles.errorButton}
          />
        </View>
      </>
    );
  }

  if (gameState === "genreSelection") {
    return (
      <>
        <Header title="Blurchette" variant="withBack" />
        <View style={styles.container}>
          <View style={styles.setupContainer}>
            <ThemedText type="title" style={styles.title}>
              Choisissez votre style
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Sélectionnez un genre musical pour commencer
            </ThemedText>

            {loadingGenres ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary.survol} />
              </View>
            ) : (
              <FlatList
                data={genres}
                numColumns={2}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.genreGrid}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.genreCard}
                    onPress={() => startGame(item)}
                    disabled={loadingTrack}
                  >
                    <Image
                      source={{ uri: item.picture_medium }}
                      style={styles.genreImage}
                    />
                    <View style={styles.genreOverlay}>
                      <ThemedText style={styles.genreName}>
                        {item.name}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}

            {loadingTrack && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={Colors.primary.survol} />
                <ThemedText style={styles.loadingText}>
                  Chargement...
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </>
    );
  }

  if (gameState === "playing" && currentTrack) {
    return (
      <>
        <Header title="Blurchette" variant="withBack" />
        <View style={styles.container}>
          <View style={styles.gameHeader}>
            <View style={styles.levelInfo}>
              <View style={styles.levelBadge}>
                <ThemedText style={styles.levelText}>
                  Niveau {blurLevel}/5
                </ThemedText>
              </View>
              <ThemedText style={styles.hintText}>
                {currentTrack.isAlbum
                  ? "🎵 Trouvez l'album"
                  : "🎤 Trouvez le single"}
              </ThemedText>
            </View>
          </View>

          <View style={styles.albumContainer}>
            <View style={styles.albumPlaceholder}>
              <Image
                source={{ uri: currentTrack.track.album.cover_xl }}
                style={styles.albumImage}
                blurRadius={getBlurRadius(blurLevel)}
              />
            </View>
          </View>

          <View style={styles.answerSection}>
            <TextInput
              style={styles.answerInput}
              placeholder="Entrez votre réponse..."
              placeholderTextColor="#666"
              value={answer}
              onChangeText={setAnswer}
              autoCorrect={false}
              autoCapitalize="words"
              editable={!hasAnswered}
              onSubmitEditing={submitAnswer}
              returnKeyType="done"
            />
            <Button
              title="Valider"
              onPress={submitAnswer}
              style={styles.submitButton}
              disabled={!answer.trim() || hasAnswered}
            />
          </View>
        </View>
      </>
    );
  }

  if (gameState === "result" && currentTrack) {
    return (
      <>
        <Header title="Blurchette" variant="withBack" />
        <View style={styles.container}>
          <View style={styles.resultContainer}>
            <ThemedText type="title" style={styles.title}>
              {foundCorrect ? "Bravo ! 🎉" : "Dommage ! 😔"}
            </ThemedText>

            <View style={styles.albumReveal}>
              <Image
                source={{ uri: currentTrack.track.album.cover_xl }}
                style={styles.revealImage}
              />
              <View style={styles.revealInfo}>
                <ThemedText style={styles.revealLabel}>
                  {currentTrack.isAlbum ? "Album" : "Single"}
                </ThemedText>
                <ThemedText style={styles.albumTitle}>
                  {currentTrack.isAlbum
                    ? currentTrack.track.album.title
                    : currentTrack.track.title}
                </ThemedText>
                <ThemedText style={styles.artistName}>
                  {currentTrack.track.artist.name}
                </ThemedText>
              </View>
            </View>

            <View style={styles.resultActions}>
              <Button
                title="Rejouer"
                onPress={resetGame}
                style={styles.replayButton}
              />
            </View>
          </View>
        </View>
      </>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
  },
  setupContainer: {
    flex: 1,
    padding: 20,
  },
  title: {
    textAlign: "center",
    marginBottom: 10,
    marginTop: 20,
  },
  subtitle: {
    textAlign: "center",
    color: "#999",
    fontSize: 16,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  genreGrid: {
    paddingBottom: 20,
  },
  genreCard: {
    flex: 1,
    margin: 8,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  genreImage: {
    width: "100%",
    height: "100%",
  },
  genreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  genreName: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    paddingHorizontal: 10,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    marginTop: 15,
    fontSize: 16,
  },
  gameHeader: {
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    gap: 12,
  },
  objectiveText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  gameInfo: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  genreText: {
    color: "#999",
    fontSize: 14,
  },
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
  levelText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  albumContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  albumPlaceholder: {
    width: 320,
    height: 320,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  albumImage: {
    width: "100%",
    height: "100%",
  },
  hintContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  hintText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  hintSubtext: {
    color: "#999",
    fontSize: 14,
    marginTop: 5,
  },
  answerSection: {
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    gap: 12,
  },
  answerInput: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 18,
    color: "white",
    fontSize: 18,
    borderWidth: 2,
    borderColor: Colors.primary.survol,
    textAlign: "center",
  },
  submitButton: {
    paddingVertical: 16,
  },
  resultContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  albumReveal: {
    alignItems: "center",
    marginBottom: 30,
  },
  revealImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginBottom: 20,
  },
  revealInfo: {
    alignItems: "center",
  },
  revealLabel: {
    color: "#999",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  albumTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  artistName: {
    color: "#999",
    fontSize: 16,
    textAlign: "center",
  },
  resultActions: {
    gap: 12,
  },
  replayButton: {
    paddingVertical: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorTitle: {
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
    color: "#ff6b6b",
  },
  errorText: {
    color: "#999",
    textAlign: "center",
    fontSize: 16,
    marginBottom: 30,
  },
  errorButton: {
    paddingHorizontal: 40,
  },
});
