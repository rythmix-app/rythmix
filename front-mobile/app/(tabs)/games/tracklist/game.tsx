import { useRef } from "react";
import {
  ActivityIndicator,
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
import { router } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import GameLayout from "@/components/GameLayout";
import Header from "@/components/Header";
import { GameErrorFeedback } from "@/components/GameErrorFeedback";
import { Colors } from "@/constants/Colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useTracklistGame } from "./hooks/useTracklistGame";

export default function TracklistGameScreen() {
  const inputRef = useRef<TextInput>(null);
  const {
    gameState,
    searchQuery,
    searchResults,
    topArtists,
    isSearching,
    isInitialLoading,
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
  } = useTracklistGame();

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

  if (gameState === "artistSearch") {
    return (
      <GameLayout title="Tracklist" sessionId={sessionId} onSave={autoSave}>
        <View style={styles.container}>
          <View style={styles.setupContainer}>
            <ThemedText type="title" style={styles.title}>
              Cherchez un artiste
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Entrez le nom d&apos;un artiste pour tester vos connaissances
            </ThemedText>

            <View style={styles.searchContainer}>
              <MaterialIcons
                name="search"
                size={24}
                color={Colors.game.textMuted}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un artiste..."
                placeholderTextColor={Colors.game.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  style={styles.clearButton}
                >
                  <MaterialIcons
                    name="close"
                    size={20}
                    color={Colors.game.textMuted}
                  />
                </TouchableOpacity>
              )}
            </View>

            {isSearching || isInitialLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary.survol} />
              </View>
            ) : (
              <FlatList
                data={
                  searchQuery.trim().length >= 3 ? searchResults : topArtists
                }
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.artistList}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                  searchQuery.trim().length < 3 && topArtists.length > 0 ? (
                    <ThemedText style={styles.sectionTitle}>
                      Artistes populaires en France
                    </ThemedText>
                  ) : null
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.artistListItem}
                    onPress={() => handleSelectArtist(item)}
                    disabled={loadingAlbum}
                  >
                    <Image
                      source={{ uri: item.picture_medium }}
                      style={styles.artistListImage}
                    />
                    <View style={styles.artistListInfo}>
                      <ThemedText style={styles.artistListName}>
                        {item.name}
                      </ThemedText>
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={24}
                      color={Colors.game.textMuted}
                    />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  searchQuery.trim().length >= 3 ? (
                    <ThemedText style={styles.emptyText}>
                      Aucun artiste trouvé
                    </ThemedText>
                  ) : searchQuery.trim().length < 3 && !isInitialLoading ? (
                    <ThemedText style={styles.emptyText}>
                      Aucune suggestion disponible
                    </ThemedText>
                  ) : null
                }
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
      </GameLayout>
    );
  }

  if (gameState === "albumSelection") {
    return (
      <GameLayout
        title="Tracklist"
        sessionId={sessionId}
        onSave={autoSave}
        onBack={backToArtistSearch}
      >
        <View style={styles.container}>
          <View style={styles.setupContainer}>
            <ThemedText type="title" style={styles.title}>
              Choisissez un album
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {selectedArtist?.name} — Quel album veux-tu trouver ?
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: Colors.dark.text,
    fontSize: 16,
  },
  artistList: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginTop: 10,
    marginBottom: 15,
  },
  artistListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  artistListImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  artistListInfo: {
    flex: 1,
  },
  artistListName: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.dark.text,
  },
  emptyText: {
    textAlign: "center",
    color: Colors.game.textMuted,
    marginTop: 40,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  genreGrid: {
    paddingBottom: 20,
  },
  clearButton: {
    padding: 8,
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
