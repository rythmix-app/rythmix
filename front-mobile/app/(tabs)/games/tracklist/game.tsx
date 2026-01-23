import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
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
import {
  deezerAPI,
  DeezerGenre,
  DeezerAlbum,
  DeezerTrack,
} from "@/services/deezer-api";
import { useAuthStore } from "@/stores/authStore";
import {
  createGameSession,
  updateGameSession,
} from "@/services/gameSessionService";
import { TracklistGameData, TrackAnswer } from "@/types/gameSession";
import { MaterialIcons } from "@expo/vector-icons";

type GameState = "genreSelection" | "playing" | "result";

interface GameAlbum {
  album: DeezerAlbum;
  tracks: DeezerTrack[];
}

const GAME_DURATION = 300; // 5 minutes in seconds

const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
};

export default function TracklistGameScreen() {
  const [gameState, setGameState] = useState<GameState>("genreSelection");
  const [genres, setGenres] = useState<DeezerGenre[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [loadingAlbum, setLoadingAlbum] = useState(false);

  const [currentAlbum, setCurrentAlbum] = useState<GameAlbum | null>(null);
  const [userAnswers, setUserAnswers] = useState<string[]>(["", "", "", ""]);
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [validatedAnswers, setValidatedAnswers] = useState<TrackAnswer[]>([]);

  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    loadGenres();
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeRemaining]);

  // Auto-submit when timer reaches 0
  useEffect(() => {
    if (timeRemaining === 0 && !isTimerRunning && gameState === "playing") {
      void submitAnswers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, isTimerRunning, gameState]);

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
    setLoadingAlbum(true);

    try {
      // Récupérer les albums du genre
      const albumsResponse = await deezerAPI.getGenreAlbums(genre.id, 50);

      if (!albumsResponse.data || albumsResponse.data.length === 0) {
        Alert.alert("Erreur", "Aucun album trouvé pour ce genre");
        setLoadingAlbum(false);
        return;
      }

      // Essayer de trouver un album avec au moins 5 titres
      // On essaie plusieurs fois car nb_tracks n'est pas fiable
      let albumDetails: DeezerAlbum | null = null;
      let tracksResponse: { data: DeezerTrack[] } | null = null;
      const maxAttempts = 10;
      const availableAlbums = [...albumsResponse.data];

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (availableAlbums.length === 0) {
          break;
        }

        // Sélectionner un album aléatoire
        const randomIndex = Math.floor(Math.random() * availableAlbums.length);
        const randomAlbum = availableAlbums[randomIndex];
        availableAlbums.splice(randomIndex, 1); // Retirer de la liste pour ne pas réessayer

        try {
          // Récupérer les détails et tracks de l'album
          const details = await deezerAPI.getAlbum(randomAlbum.id);
          const tracks = await deezerAPI.getAlbumTracks(randomAlbum.id);

          // Vérifier qu'il y a au moins 5 titres
          if (tracks.data && tracks.data.length >= 5) {
            albumDetails = details;
            tracksResponse = tracks;
            break;
          }
        } catch (err) {
          console.error(`Failed to load album ${randomAlbum.id}:`, err);
          // Continuer avec le prochain album
        }
      }

      // Si aucun album valide trouvé après toutes les tentatives
      if (!albumDetails || !tracksResponse) {
        Alert.alert(
          "Erreur",
          "Aucun album avec suffisamment de titres trouvé. Essayez un autre genre.",
        );
        setLoadingAlbum(false);
        return;
      }

      const gameAlbum: GameAlbum = {
        album: albumDetails,
        tracks: tracksResponse.data,
      };

      if (!gameId || !user) {
        setSessionError(true);
        setLoadingAlbum(false);
        return;
      }

      try {
        const gameData: TracklistGameData = {
          genre: {
            id: genre.id,
            name: genre.name,
          },
          album: {
            id: albumDetails.id,
            title: albumDetails.title,
            artistName: albumDetails.artist.name,
            coverUrl: albumDetails.cover_xl,
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
          players: {
            [user.id]: user.username,
          },
          gameData: gameData as unknown as Record<string, unknown>,
        });

        setSessionId(session.id);
        setValidatedAnswers([]);
      } catch (sessionErr) {
        console.error("Failed to create game session:", sessionErr);
        setSessionError(true);
        setLoadingAlbum(false);
        return;
      }

      setCurrentAlbum(gameAlbum);
      setUserAnswers(new Array(tracksResponse.data.length).fill(""));
      setTimeRemaining(GAME_DURATION);
      setIsTimerRunning(true);
      setGameState("playing");
    } catch (error) {
      console.error("Failed to load album:", error);
      Alert.alert("Erreur", "Impossible de charger l'album");
    } finally {
      setLoadingAlbum(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerChange = (index: number, text: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[index] = text;
    setUserAnswers(newAnswers);
  };

  const handleAddField = () => {
    if (currentAlbum && userAnswers.length < currentAlbum.tracks.length + 5) {
      setUserAnswers([...userAnswers, ""]);
    }
  };

  const checkAnswer = (
    userInput: string,
    targetText: string,
  ): boolean => {
    const normalizedAnswer = normalizeString(userInput);
    const normalizedTarget = normalizeString(targetText);

    if (normalizedAnswer.length < 3) return false;

    return (
      normalizedTarget.includes(normalizedAnswer) ||
      normalizedAnswer.includes(normalizedTarget)
    );
  };

  const checkAllAnswers = (): TrackAnswer[] => {
    if (!currentAlbum) return [];

    const correctTracks = currentAlbum.tracks;
    const results: TrackAnswer[] = [];
    const usedTrackIds = new Set<number>();

    userAnswers.forEach((userInput) => {
      const trimmedInput = userInput.trim();

      if (!trimmedInput) {
        results.push({
          userInput: trimmedInput,
          isCorrect: false,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Vérifier si c'est un doublon côté utilisateur
      const isDuplicate = results.some(
        (r) =>
          r.isCorrect &&
          normalizeString(r.userInput) === normalizeString(trimmedInput),
      );

      if (isDuplicate) {
        results.push({
          userInput: trimmedInput,
          isCorrect: false,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Chercher une correspondance
      const matchedTrack = correctTracks.find(
        (track) =>
          !usedTrackIds.has(track.id) &&
          (checkAnswer(trimmedInput, track.title) ||
            checkAnswer(trimmedInput, track.title_short)),
      );

      if (matchedTrack) {
        usedTrackIds.add(matchedTrack.id);
        results.push({
          userInput: trimmedInput,
          isCorrect: true,
          matchedTrackId: matchedTrack.id,
          timestamp: new Date().toISOString(),
        });
      } else {
        results.push({
          userInput: trimmedInput,
          isCorrect: false,
          timestamp: new Date().toISOString(),
        });
      }
    });

    return results;
  };

  const submitAnswers = async () => {
    if (!currentAlbum) return;

    setIsTimerRunning(false);
    const results = checkAllAnswers();
    setValidatedAnswers(results);

    const score = results.filter((r) => r.isCorrect).length;

    if (sessionId) {
      try {
        const finalData: Partial<TracklistGameData> = {
          answers: results,
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

    setGameState("result");
  };

  const handleAbandon = () => {
    Alert.alert(
      "Abandonner",
      "Êtes-vous sûr de vouloir abandonner cette partie ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui",
          style: "destructive",
          onPress: () => {
            setIsTimerRunning(false);
            submitAnswers();
          },
        },
      ],
    );
  };

  const resetGame = () => {
    setGameState("genreSelection");
    setCurrentAlbum(null);
    setUserAnswers(["", "", "", ""]);
    setTimeRemaining(GAME_DURATION);
    setIsTimerRunning(false);
    setValidatedAnswers([]);
    setSessionId(null);
  };

  if (sessionError) {
    return (
      <>
        <Header title="Tracklist" variant="withBack" />
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
        <Header title="Tracklist" variant="withBack" />
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
                    disabled={loadingAlbum}
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

            {loadingAlbum && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={Colors.primary.survol} />
                <ThemedText style={styles.loadingText}>
                  Chargement de l&apos;album...
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </>
    );
  }

  if (gameState === "playing" && currentAlbum) {
    return (
      <>
        <Header title="Tracklist" variant="withBack" />
        <View style={styles.container}>
          <View style={styles.gameHeader}>
            <View style={styles.timerContainer}>
              <MaterialIcons
                name="timer"
                size={24}
                color={
                  timeRemaining < 60 ? "#ff6b6b" : Colors.primary.survol
                }
              />
              <ThemedText
                style={[
                  styles.timerText,
                  timeRemaining < 60 && styles.timerWarning,
                ]}
              >
                {formatTime(timeRemaining)}
              </ThemedText>
            </View>
            <Button
              title="Abandonner"
              onPress={handleAbandon}
              style={styles.abandonButton}
            />
          </View>

          <View style={styles.albumInfo}>
            <Image
              source={{ uri: currentAlbum.album.cover_xl }}
              style={styles.coverImage}
            />
            <ThemedText style={styles.albumTitle}>
              {currentAlbum.album.title}
            </ThemedText>
            <ThemedText style={styles.artistName}>
              {currentAlbum.album.artist.name}
            </ThemedText>
            <ThemedText style={styles.trackCount}>
              {currentAlbum.tracks.length} titres à trouver
            </ThemedText>
          </View>

          <ScrollView
            style={styles.answersContainer}
            contentContainerStyle={styles.answersContent}
          >
            <ThemedText style={styles.instructionText}>
              Listez les titres de l&apos;album :
            </ThemedText>
            {userAnswers.map((answer, index) => (
              <TextInput
                key={index}
                style={styles.answerInput}
                placeholder={`Titre ${index + 1}`}
                placeholderTextColor="#666"
                value={answer}
                onChangeText={(text) => handleAnswerChange(index, text)}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="next"
              />
            ))}
            {userAnswers.length < currentAlbum.tracks.length + 5 && (
              <TouchableOpacity
                style={styles.addFieldButton}
                onPress={handleAddField}
              >
                <MaterialIcons
                  name="add-circle"
                  size={24}
                  color={Colors.primary.survol}
                />
                <ThemedText style={styles.addFieldText}>
                  Ajouter un champ
                </ThemedText>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={styles.submitContainer}>
            <Button
              title="Valider mes réponses"
              onPress={submitAnswers}
              style={styles.submitButton}
            />
          </View>
        </View>
      </>
    );
  }

  if (gameState === "result" && currentAlbum) {
    const score = validatedAnswers.filter((r) => r.isCorrect).length;
    const maxScore = currentAlbum.tracks.length;
    const percentage = Math.round((score / maxScore) * 100);

    return (
      <>
        <Header title="Tracklist" variant="withBack" />
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.resultContent}
        >
          <View style={styles.resultHeader}>
            <ThemedText type="title" style={styles.resultTitle}>
              {percentage >= 75 ? "Excellent ! 🎉" : percentage >= 50 ? "Bien joué ! 👍" : "Continuez à vous entraîner ! 💪"}
            </ThemedText>

            <View style={styles.scoreCard}>
              <ThemedText style={styles.scoreText}>
                {score} / {maxScore}
              </ThemedText>
              <ThemedText style={styles.scoreLabel}>
                Titres trouvés ({percentage}%)
              </ThemedText>
            </View>

            <View style={styles.albumReveal}>
              <Image
                source={{ uri: currentAlbum.album.cover_xl }}
                style={styles.revealImage}
              />
              <ThemedText style={styles.revealAlbumTitle}>
                {currentAlbum.album.title}
              </ThemedText>
              <ThemedText style={styles.revealArtistName}>
                {currentAlbum.album.artist.name}
              </ThemedText>
            </View>
          </View>

          <View style={styles.comparisonSection}>
            <ThemedText style={styles.comparisonTitle}>
              Comparaison des résultats
            </ThemedText>

            <View style={styles.comparisonContainer}>
              <View style={styles.column}>
                <ThemedText style={styles.columnTitle}>
                  Vos réponses
                </ThemedText>
                {validatedAnswers
                  .filter((a) => a.userInput)
                  .map((answer, index) => (
                    <View key={index} style={styles.answerItem}>
                      <MaterialIcons
                        name={answer.isCorrect ? "check-circle" : "cancel"}
                        size={20}
                        color={answer.isCorrect ? "#4CAF50" : "#f44336"}
                      />
                      <ThemedText
                        style={[
                          styles.answerText,
                          answer.isCorrect && styles.answerCorrect,
                          !answer.isCorrect && styles.answerIncorrect,
                        ]}
                      >
                        {answer.userInput}
                      </ThemedText>
                    </View>
                  ))}
                {validatedAnswers.filter((a) => a.userInput).length === 0 && (
                  <ThemedText style={styles.emptyText}>
                    Aucune réponse
                  </ThemedText>
                )}
              </View>

              <View style={styles.column}>
                <ThemedText style={styles.columnTitle}>
                  Titres de l&apos;album
                </ThemedText>
                {currentAlbum.tracks.map((track, index) => {
                  const isFound = validatedAnswers.some(
                    (a) => a.matchedTrackId === track.id,
                  );
                  return (
                    <View key={track.id} style={styles.answerItem}>
                      <ThemedText style={styles.trackNumber}>
                        {index + 1}.
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.answerText,
                          isFound && styles.answerCorrect,
                        ]}
                      >
                        {track.title}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.resultActions}>
            <Button
              title="Rejouer"
              onPress={resetGame}
              style={styles.replayButton}
            />
            <Button
              title="Retour aux jeux"
              onPress={() => router.push("/games")}
              style={styles.backButton}
            />
          </View>
        </ScrollView>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timerText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  timerWarning: {
    color: "#ff6b6b",
  },
  abandonButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 107, 107, 0.2)",
  },
  albumInfo: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  coverImage: {
    width: 150,
    height: 150,
    borderRadius: 12,
    marginBottom: 15,
  },
  albumTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  artistName: {
    color: "#999",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
  },
  trackCount: {
    color: Colors.primary.survol,
    fontSize: 14,
    fontWeight: "bold",
  },
  answersContainer: {
    flex: 1,
  },
  answersContent: {
    padding: 20,
    paddingBottom: 100,
  },
  instructionText: {
    color: "white",
    fontSize: 16,
    marginBottom: 15,
    fontWeight: "bold",
  },
  answerInput: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 12,
    color: "white",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: 10,
  },
  addFieldButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.primary.survol,
    borderStyle: "dashed",
  },
  addFieldText: {
    color: Colors.primary.survol,
    fontSize: 16,
    fontWeight: "bold",
  },
  submitContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  submitButton: {
    paddingVertical: 16,
  },
  resultContent: {
    padding: 20,
    paddingBottom: 40,
  },
  resultHeader: {
    alignItems: "center",
    marginBottom: 30,
  },
  resultTitle: {
    textAlign: "center",
    marginBottom: 20,
  },
  scoreCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.primary.survol,
  },
  scoreText: {
    color: Colors.primary.survol,
    fontSize: 48,
    fontWeight: "bold",
  },
  scoreLabel: {
    color: "white",
    fontSize: 16,
    marginTop: 5,
  },
  albumReveal: {
    alignItems: "center",
  },
  revealImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginBottom: 15,
  },
  revealAlbumTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  revealArtistName: {
    color: "#999",
    fontSize: 16,
    textAlign: "center",
  },
  comparisonSection: {
    marginBottom: 30,
  },
  comparisonTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  comparisonContainer: {
    flexDirection: "row",
    gap: 10,
  },
  column: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 15,
    borderRadius: 12,
  },
  columnTitle: {
    color: Colors.primary.survol,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  answerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  trackNumber: {
    color: "#999",
    fontSize: 14,
    minWidth: 25,
  },
  answerText: {
    color: "#CCC",
    fontSize: 14,
    flex: 1,
  },
  answerCorrect: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
  answerIncorrect: {
    color: "#f44336",
  },
  emptyText: {
    color: "#666",
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
  },
  resultActions: {
    gap: 12,
  },
  replayButton: {
    paddingVertical: 16,
  },
  backButton: {
    paddingVertical: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
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
