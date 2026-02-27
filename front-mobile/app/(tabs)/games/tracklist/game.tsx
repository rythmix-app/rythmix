import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
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
  DeezerArtist,
  DeezerTrack,
} from "@/services/deezer-api";
import { useAuthStore } from "@/stores/authStore";
import {
  createGameSession,
  updateGameSession,
} from "@/services/gameSessionService";
import { TracklistGameData, TrackAnswer } from "@/types/gameSession";
import { MaterialIcons } from "@expo/vector-icons";

type GameState =
  | "genreSelection"
  | "artistSelection"
  | "albumSelection"
  | "playing"
  | "result";

interface GameAlbum {
  album: DeezerAlbum;
  tracks: DeezerTrack[];
}

interface AnswerFeedback {
  type: "correct" | "wrong";
  message: string;
}

const GAME_DURATION = 300; // 5 minutes in seconds
const FUZZY_THRESHOLD = 0.75; // Similarity threshold for fuzzy matching (0–1), adjustable
const ALBUM_CHOICES = 6; // Number of albums proposed in the selection screen

const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
};

const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const fuzzyMatch = (input: string, target: string): boolean => {
  const normalizedInput = normalizeString(input);
  const normalizedTarget = normalizeString(target);

  if (normalizedInput.length < 3) return false;

  // Exact substring match first
  if (
    normalizedTarget.includes(normalizedInput) ||
    normalizedInput.includes(normalizedTarget)
  ) {
    return true;
  }

  // Fuzzy match with Levenshtein similarity
  const maxLength = Math.max(normalizedInput.length, normalizedTarget.length);
  const distance = levenshteinDistance(normalizedInput, normalizedTarget);
  return 1 - distance / maxLength >= FUZZY_THRESHOLD;
};

export default function TracklistGameScreen() {
  const [gameState, setGameState] = useState<GameState>("genreSelection");
  const [genres, setGenres] = useState<DeezerGenre[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [loadingAlbum, setLoadingAlbum] = useState(false);

  const [candidateArtists, setCandidateArtists] = useState<DeezerArtist[]>([]);
  const [candidateAlbums, setCandidateAlbums] = useState<DeezerAlbum[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<DeezerGenre | null>(null);
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

  const inputRef = useRef<TextInput>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Cleanup feedback timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
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

  const handleSelectGenre = async (genre: DeezerGenre) => {
    setLoadingAlbum(true);
    setSelectedGenre(genre);

    try {
      const artistsResponse = await deezerAPI.getGenreTopArtists(genre.id, 25);

      if (!artistsResponse.data || artistsResponse.data.length === 0) {
        Alert.alert("Erreur", "Aucun artiste trouvé pour ce genre");
        return;
      }

      setCandidateArtists(artistsResponse.data);
      setGameState("artistSelection");
    } catch (error) {
      console.error("Failed to load artists:", error);
      Alert.alert("Erreur", "Impossible de charger les artistes");
    } finally {
      setLoadingAlbum(false);
    }
  };

  const handleSelectArtist = async (artist: DeezerArtist) => {
    setLoadingAlbum(true);
    setSelectedArtist(artist);

    try {
      const albumsResponse = await deezerAPI.getArtistAlbums(artist.id, 25);

      if (!albumsResponse.data || albumsResponse.data.length === 0) {
        Alert.alert("Erreur", "Aucun album trouvé pour cet artiste");
        return;
      }

      // Garder uniquement les vrais albums (pas les singles/compilations)
      const albums = albumsResponse.data.filter(
        (a) => a.record_type === "album",
      );
      const pool = albums.length > 0 ? albums : albumsResponse.data;
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      setCandidateAlbums(shuffled.slice(0, ALBUM_CHOICES));
      setGameState("albumSelection");
    } catch (error) {
      console.error("Failed to load albums:", error);
      Alert.alert("Erreur", "Impossible de charger les albums");
    } finally {
      setLoadingAlbum(false);
    }
  };

  const startGameWithAlbum = async (album: DeezerAlbum) => {
    if (!gameId || !user) {
      setSessionError(true);
      return;
    }

    setLoadingAlbum(true);

    try {
      const tracksResponse = await deezerAPI.getAlbumTracks(album.id);

      if (!tracksResponse.data || tracksResponse.data.length < 5) {
        Alert.alert(
          "Album insuffisant",
          "Cet album n'a pas assez de titres. Choisissez-en un autre.",
        );
        return;
      }

      const gameAlbum: GameAlbum = {
        album,
        tracks: tracksResponse.data,
      };

      const gameData: TracklistGameData = {
        genre: selectedGenre
          ? { id: selectedGenre.id, name: selectedGenre.name }
          : { id: 0, name: "" },
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
        players: { [user.id]: user.username },
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
      Alert.alert("Erreur", "Impossible de démarrer la partie");
    } finally {
      setLoadingAlbum(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const showFeedback = (type: "correct" | "wrong", message: string) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setAnswerFeedback({ type, message });
    feedbackTimeoutRef.current = setTimeout(
      () => setAnswerFeedback(null),
      1500,
    );
  };

  const handleSubmitAnswer = () => {
    const trimmed = currentInput.trim();
    if (!trimmed || !currentAlbum) return;

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

      // Auto-submit if all tracks found
      if (newFoundIds.size === currentAlbum.tracks.length) {
        void submitAnswers(newFoundIds, newAnswers);
      }
    } else {
      setCurrentInput("");
      showFeedback("wrong", "Essaie encore !");
    }
  };

  const submitAnswers = async (
    finalFoundIds?: Set<number>,
    finalAnswers?: TrackAnswer[],
  ) => {
    if (!currentAlbum) return;

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
            void submitAnswers();
          },
        },
      ],
    );
  };

  const resetGame = () => {
    setGameState("genreSelection");
    setCurrentAlbum(null);
    setCandidateArtists([]);
    setCandidateAlbums([]);
    setSelectedGenre(null);
    setSelectedArtist(null);
    setCurrentInput("");
    setFoundTrackIds(new Set());
    setTimeRemaining(GAME_DURATION);
    setIsTimerRunning(false);
    setValidatedAnswers([]);
    setSessionId(null);
    setAnswerFeedback(null);
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

  // ─── Genre selection ───────────────────────────────────────────────────────

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
                key="genres"
                data={genres}
                numColumns={2}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.genreGrid}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.genreCard}
                    onPress={() => handleSelectGenre(item)}
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
                  Chargement des albums...
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </>
    );
  }

  // ─── Artist selection ──────────────────────────────────────────────────────

  if (gameState === "artistSelection") {
    return (
      <>
        <Header title="Tracklist" variant="withBack" />
        <View style={styles.container}>
          <View style={styles.setupContainer}>
            <ThemedText type="title" style={styles.title}>
              Choisissez un artiste
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {selectedGenre?.name} — Sur quel artiste veux-tu jouer ?
            </ThemedText>

            <FlatList
              key="artists"
              data={candidateArtists}
              numColumns={3}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.genreGrid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.artistCard}
                  onPress={() => handleSelectArtist(item)}
                  disabled={loadingAlbum}
                >
                  <Image
                    source={{ uri: item.picture_medium }}
                    style={styles.artistPicture}
                  />
                  <ThemedText style={styles.artistCardName} numberOfLines={2}>
                    {item.name}
                  </ThemedText>
                </TouchableOpacity>
              )}
            />

            {loadingAlbum && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={Colors.primary.survol} />
                <ThemedText style={styles.loadingText}>
                  Chargement des albums...
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </>
    );
  }

  // ─── Album selection ───────────────────────────────────────────────────────

  if (gameState === "albumSelection") {
    return (
      <>
        <Header title="Tracklist" variant="withBack" />
        <View style={styles.container}>
          <View style={styles.setupContainer}>
            <ThemedText type="title" style={styles.title}>
              Choisissez un album
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {selectedGenre?.name} — Quel album veux-tu trouver ?
            </ThemedText>

            <FlatList
              key="albums"
              data={candidateAlbums}
              numColumns={2}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.genreGrid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.albumChoiceCard}
                  onPress={() => startGameWithAlbum(item)}
                  disabled={loadingAlbum}
                >
                  <Image
                    source={{ uri: item.cover_medium }}
                    style={styles.albumChoiceCover}
                  />
                  <View style={styles.albumChoiceInfo}>
                    <ThemedText
                      style={styles.albumChoiceTitle}
                      numberOfLines={2}
                    >
                      {item.title}
                    </ThemedText>
                    <ThemedText
                      style={styles.albumChoiceArtist}
                      numberOfLines={1}
                    >
                      {item.artist?.name ?? selectedArtist?.name}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              )}
            />

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

  // ─── Playing ───────────────────────────────────────────────────────────────

  if (gameState === "playing" && currentAlbum) {
    const foundCount = foundTrackIds.size;
    const totalCount = currentAlbum.tracks.length;

    return (
      <>
        <Header title="Trackliste" variant="withBack" />
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          {/* Badges compteur + chrono */}
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>
                {foundCount}/{totalCount} TROUVÉ
              </ThemedText>
            </View>
            <View
              style={[styles.badge, timeRemaining < 60 && styles.badgeWarning]}
            >
              <MaterialIcons
                name="timer"
                size={14}
                color={timeRemaining < 60 ? "#ff6b6b" : Colors.primary.survol}
              />
              <ThemedText
                style={[
                  styles.badgeText,
                  timeRemaining < 60 && styles.badgeTextWarning,
                ]}
              >
                {formatTime(timeRemaining)}
              </ThemedText>
            </View>
          </View>

          {/* Carte album */}
          <View style={styles.albumCard}>
            <Image
              source={{ uri: currentAlbum.album.cover_xl }}
              style={styles.coverImage}
            />
            <ThemedText style={styles.albumTitle}>
              {currentAlbum.album.title}
            </ThemedText>
            <ThemedText style={styles.artistName}>
              {currentAlbum.album.artist?.name ?? selectedArtist?.name}
            </ThemedText>
            <TouchableOpacity
              style={styles.abandonButtonSmall}
              onPress={handleAbandon}
            >
              <ThemedText style={styles.abandonText}>Abandonner</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Liste des titres (scrollable) */}
          <ScrollView
            style={styles.trackList}
            contentContainerStyle={styles.trackListContent}
            keyboardShouldPersistTaps="handled"
          >
            {currentAlbum.tracks.map((track, index) => {
              const isFound = foundTrackIds.has(track.id);
              return (
                <View key={track.id} style={styles.trackItem}>
                  <ThemedText style={styles.trackNumber}>
                    {index + 1}.
                  </ThemedText>
                  {isFound ? (
                    <>
                      <ThemedText style={styles.trackFound}>
                        {track.title}
                      </ThemedText>
                      <MaterialIcons
                        name="check-circle"
                        size={16}
                        color="#4CAF50"
                      />
                    </>
                  ) : (
                    <ThemedText style={styles.trackHidden}>
                      {track.title.charAt(0).toUpperCase()}_ _ _
                    </ThemedText>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Feedback réponse + champ de saisie épinglé en bas */}
          <View style={styles.inputWrapper}>
            {answerFeedback && (
              <View
                style={[
                  styles.feedbackBanner,
                  answerFeedback.type === "correct"
                    ? styles.feedbackCorrect
                    : styles.feedbackWrong,
                ]}
              >
                <ThemedText style={styles.feedbackText}>
                  {answerFeedback.message}
                </ThemedText>
              </View>
            )}
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.singleInput}
                placeholder="Tape un son..."
                placeholderTextColor="#666"
                value={currentInput}
                onChangeText={setCurrentInput}
                onSubmitEditing={handleSubmitAnswer}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="send"
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSubmitAnswer}
              >
                <MaterialIcons
                  name="send"
                  size={22}
                  color={Colors.primary.survol}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </>
    );
  }

  // ─── Result ────────────────────────────────────────────────────────────────

  if (gameState === "result" && currentAlbum) {
    const score = foundTrackIds.size;
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
              {percentage >= 75
                ? "Excellent ! 🎉"
                : percentage >= 50
                  ? "Bien joué ! 👍"
                  : "Continuez à vous entraîner ! 💪"}
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
                {currentAlbum.album.artist?.name ?? selectedArtist?.name}
              </ThemedText>
            </View>
          </View>

          <View style={styles.comparisonSection}>
            <ThemedText style={styles.comparisonTitle}>
              Titres de l&apos;album
            </ThemedText>
            <View style={styles.trackResultList}>
              {currentAlbum.tracks.map((track, index) => {
                const isFound = foundTrackIds.has(track.id);
                return (
                  <View key={track.id} style={styles.trackResultItem}>
                    <MaterialIcons
                      name={isFound ? "check-circle" : "cancel"}
                      size={20}
                      color={isFound ? "#4CAF50" : "#f44336"}
                    />
                    <ThemedText style={styles.trackResultNumber}>
                      {index + 1}.
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.trackResultText,
                        isFound && styles.answerCorrect,
                        !isFound && styles.answerIncorrect,
                      ]}
                    >
                      {track.title}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.resultActions}>
            <Button title="Rejouer" onPress={resetGame} />
            <Button
              title="Retour aux jeux"
              variant="outline"
              onPress={() => router.push("/games")}
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
  // Artist cards
  artistCard: {
    flex: 1,
    margin: 6,
    alignItems: "center",
  },
  artistPicture: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 60,
    marginBottom: 6,
  },
  artistCardName: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  // Album choice cards
  albumChoiceCard: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  albumChoiceCover: {
    width: "100%",
    aspectRatio: 1,
  },
  albumChoiceInfo: {
    padding: 8,
  },
  albumChoiceTitle: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  albumChoiceArtist: {
    color: "#999",
    fontSize: 12,
  },
  // Playing screen
  badgeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary.survol,
  },
  badgeWarning: {
    borderColor: "#ff6b6b",
  },
  badgeText: {
    color: Colors.primary.survol,
    fontSize: 13,
    fontWeight: "bold",
  },
  badgeTextWarning: {
    color: "#ff6b6b",
  },
  albumCard: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  coverImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginBottom: 10,
  },
  albumTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 2,
  },
  artistName: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  abandonButtonSmall: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.5)",
  },
  abandonText: {
    color: "#ff6b6b",
    fontSize: 13,
  },
  trackList: {
    flex: 1,
  },
  trackListContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  trackNumber: {
    color: "#666",
    fontSize: 14,
    minWidth: 28,
  },
  trackFound: {
    color: "#4CAF50",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  trackHidden: {
    color: "#555",
    fontSize: 15,
    flex: 1,
    letterSpacing: 2,
  },
  // Input + feedback zone
  inputWrapper: {
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  feedbackBanner: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: "center",
  },
  feedbackCorrect: {
    backgroundColor: "rgba(76, 175, 80, 0.15)",
  },
  feedbackWrong: {
    backgroundColor: "rgba(244, 67, 54, 0.15)",
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  singleInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    color: "white",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  // Result screen
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
    lineHeight: 58,
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
  trackResultList: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 15,
  },
  trackResultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  trackResultNumber: {
    color: "#999",
    fontSize: 14,
    minWidth: 25,
  },
  trackResultText: {
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
  resultActions: {
    gap: 12,
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
