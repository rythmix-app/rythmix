import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import GameLayout from "@/components/GameLayout";
import Header from "@/components/Header";
import { GameErrorFeedback } from "@/components/GameErrorFeedback";
import { Colors } from "@/constants/Colors";
import {
  deezerAPI,
  DeezerGenre,
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
import {
  GameSession,
  TracklistGameData,
  TrackAnswer,
} from "@/types/gameSession";
import { MaterialIcons } from "@expo/vector-icons";
import { useErrorFeedback } from "@/hooks/useErrorFeedback";
import { fuzzyMatch } from "@/utils/stringUtils";

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

interface TracklistSaveState {
  gameState: GameState;
  selectedGenre: DeezerGenre | null;
  selectedArtist: DeezerArtist | null;
  candidateArtists: DeezerArtist[];
  candidateAlbums: DeezerAlbum[];
  currentAlbum: GameAlbum | null;
  foundTrackIds: number[];
  timeRemaining: number;
  validatedAnswers: TrackAnswer[];
  sessionId: string | null;
}

const GAME_DURATION = 300;
const ALBUM_CHOICES = 6;

export default function TracklistGameScreen() {
  const [showRules, setShowRules] = useState(false);
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);

  const inputRef = useRef<TextInput>(null);
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

  const loadGenres = useCallback(async () => {
    try {
      const response = await deezerAPI.getGenres();
      const filteredGenres = response.data.filter((g) => g.id !== 0);
      setGenres(filteredGenres);
    } catch (error) {
      console.error("Failed to load genres:", error);
      show({
        type: "error",
        message: "Impossible de charger les genres musicaux",
      });
    } finally {
      setLoadingGenres(false);
    }
  }, [show]);

  const loadSavedState = useCallback(async () => {
    if (!gameId) return;
    setLoadingAlbum(true);
    try {
      const saved = await getGameState<TracklistSaveState>(gameId);
      if (saved) {
        setGameState(saved.gameState);
        setSelectedGenre(saved.selectedGenre);
        setSelectedArtist(saved.selectedArtist);
        setCandidateArtists(saved.candidateArtists);
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
    loadGenres();

    if (gameId) {
      if (resume === "true") {
        void loadSavedState();
      } else {
        void deleteGameState(gameId);

        const timeout = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 5000),
        );
        Promise.race([getMyActiveSession(Number(gameId)), timeout])
          .then((session) => {
            setActiveSession(session);
          })
          .catch(() => {});
      }
    }
  }, [gameId, resume, loadGenres, loadSavedState]);

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

  const autoSave = useCallback(async () => {
    if (!gameId || gameState === "result") return;

    const saveState: TracklistSaveState = {
      gameState,
      selectedGenre,
      selectedArtist,
      candidateArtists,
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
    selectedGenre,
    selectedArtist,
    candidateArtists,
    candidateAlbums,
    currentAlbum,
    foundTrackIds,
    timeRemaining,
    validatedAnswers,
    sessionId,
  ]);

  useEffect(() => {
    if (gameState !== "result" && gameState !== "genreSelection" && gameId) {
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

  const handleSelectGenre = async (genre: DeezerGenre) => {
    setLoadingAlbum(true);
    setSelectedGenre(genre);

    try {
      const artistsResponse = await deezerAPI.getGenreTopArtists(genre.id, 25);

      if (!artistsResponse.data || artistsResponse.data.length === 0) {
        show({ type: "error", message: "Aucun artiste trouvé pour ce genre" });
        return;
      }

      setCandidateArtists(artistsResponse.data);
      setGameState("artistSelection");
    } catch (error) {
      console.error("Failed to load artists:", error);
      show({ type: "error", message: "Impossible de charger les artistes" });
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
        show({ type: "error", message: "Aucun album trouvé pour cet artiste" });
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
        show({
          type: "warning",
          message: "Cet album n'a pas assez de titres. Choisissez-en un autre.",
        });
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
            void submitAnswers();
          },
        },
      ],
    );
  };

  const resetGame = () => {
    if (gameId) {
      void deleteGameState(gameId);
    }
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
          <MaterialIcons
            name="error-outline"
            size={80}
            color={Colors.game.warning}
          />
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
      <GameLayout title="Tracklist" sessionId={sessionId} onSave={autoSave}>
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
        {rulesModal}
      </GameLayout>
    );
  }

  if (gameState === "artistSelection") {
    return (
      <GameLayout title="Tracklist" sessionId={sessionId} onSave={autoSave}>
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
                  accessibilityLabel={`Sélectionner l'artiste ${item.name}`}
                  accessibilityRole="button"
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
        {rulesModal}
      </GameLayout>
    );
  }

  if (gameState === "albumSelection") {
    return (
      <GameLayout title="Tracklist" sessionId={sessionId} onSave={autoSave}>
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
                  accessibilityLabel={`Album ${item.title} de ${item.artist?.name ?? selectedArtist?.name}`}
                  accessibilityRole="button"
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
        {rulesModal}
      </GameLayout>
    );
  }

  if (gameState === "playing" && currentAlbum) {
    const foundCount = foundTrackIds.size;
    const totalCount = currentAlbum.tracks.length;

    return (
      <GameErrorFeedback
        shakeAnimation={shakeAnimation}
        borderOpacity={borderOpacity}
        errorMessage={null}
        animationsEnabled={errorAnimationsEnabled}
      >
        <GameLayout title="Tracklist" sessionId={sessionId} onSave={autoSave}>
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>
                  {foundCount}/{totalCount}{" "}
                  {foundCount > 1 ? "TROUVÉS" : "TROUVÉ"}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.badge,
                  timeRemaining < 60 && styles.badgeWarning,
                ]}
              >
                <MaterialIcons
                  name="timer"
                  size={14}
                  color={
                    timeRemaining < 60
                      ? Colors.game.warning
                      : Colors.primary.survol
                  }
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
            <ScrollView
              style={styles.trackList}
              contentContainerStyle={styles.trackListContent}
              keyboardShouldPersistTaps="handled"
            >
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
                          color={Colors.game.success}
                        />
                      </>
                    ) : (
                      <ThemedText style={styles.trackHidden}>
                        {track.title
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() +
                              "_".repeat(Math.max(0, word.length - 1)),
                          )
                          .join(" ")}
                      </ThemedText>
                    )}
                  </View>
                );
              })}
            </ScrollView>

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
                  placeholderTextColor={Colors.game.textSubtle}
                  value={currentInput}
                  onChangeText={setCurrentInput}
                  onSubmitEditing={handleSubmitAnswer}
                  autoCorrect={false}
                  autoCapitalize="words"
                  returnKeyType="send"
                  blurOnSubmit={false}
                  accessibilityLabel="Saisir un titre de l'album"
                  accessibilityHint="Entrez un titre de chanson de l'album pour valider votre réponse"
                />
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSubmitAnswer}
                  accessibilityLabel="Valider la réponse"
                  accessibilityRole="button"
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
          {rulesModal}
        </GameLayout>
      </GameErrorFeedback>
    );
  }

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
                      color={isFound ? Colors.game.success : Colors.game.error}
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

const rulesStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#121212",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    borderTopWidth: 1,
    borderColor: "#14FFEC33",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  rule: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#14FFEC",
  },
  ruleIcon: {
    fontSize: 22,
  },
  ruleText: {
    flex: 1,
    gap: 4,
  },
  ruleBold: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  ruleDesc: {
    color: "#999",
    fontSize: 13,
  },
});

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
    color: Colors.game.textMuted,
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
    color: Colors.game.textMuted,
    fontSize: 12,
  },
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
    borderColor: Colors.game.warning,
  },
  badgeText: {
    color: Colors.primary.survol,
    fontSize: 13,
    fontWeight: "bold",
  },
  badgeTextWarning: {
    color: Colors.game.warning,
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
    color: Colors.game.textMuted,
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
    color: Colors.game.warning,
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
    color: Colors.game.textSubtle,
    fontSize: 14,
    minWidth: 28,
  },
  trackFound: {
    color: Colors.game.success,
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  trackHidden: {
    color: Colors.game.textSubtle,
    fontSize: 15,
    flex: 1,
    letterSpacing: 2,
  },
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
    color: Colors.game.textMuted,
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
    color: Colors.game.textMuted,
    fontSize: 14,
    minWidth: 25,
  },
  trackResultText: {
    fontSize: 14,
    flex: 1,
  },
  answerCorrect: {
    color: Colors.game.success,
    fontWeight: "bold",
  },
  answerIncorrect: {
    color: Colors.game.error,
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
