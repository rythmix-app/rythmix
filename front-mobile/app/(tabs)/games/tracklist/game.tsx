import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";
import { useTracklistGame } from "@/hooks/feature/tracklist/useTracklistGame";
import TracklistArtistSearch from "@/components/feature/tracklist/TracklistArtistSearch";
import TracklistAlbumStep from "@/components/feature/tracklist/TracklistAlbumStep";
import TracklistPlayingScreen from "@/components/feature/tracklist/TracklistPlayingScreen";
import TracklistResultScreen from "@/components/feature/tracklist/TracklistResultScreen";

export default function TracklistGameScreen() {
  const {
    gameState,
    searchQuery,
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
      <TracklistArtistSearch
        sessionId={sessionId}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        loadingAlbum={loadingAlbum}
        onSelectArtist={handleSelectArtist}
        onSave={autoSave}
      />
    );
  }

  if (gameState === "albumSelection") {
    return (
      <TracklistAlbumStep
        sessionId={sessionId}
        selectedArtist={selectedArtist}
        candidateAlbums={candidateAlbums}
        loadingAlbum={loadingAlbum}
        onSelectAlbum={startGameWithAlbum}
        onBack={backToArtistSearch}
        onSave={autoSave}
      />
    );
  }

  if (gameState === "playing" && currentAlbum) {
    return (
      <TracklistPlayingScreen
        sessionId={sessionId}
        currentAlbum={currentAlbum}
        selectedArtist={selectedArtist}
        foundTrackIds={foundTrackIds}
        currentInput={currentInput}
        setCurrentInput={setCurrentInput}
        answerFeedback={answerFeedback}
        timeRemaining={timeRemaining}
        formatTime={formatTime}
        shakeAnimation={shakeAnimation}
        borderOpacity={borderOpacity}
        errorAnimationsEnabled={errorAnimationsEnabled}
        onSubmitAnswer={handleSubmitAnswer}
        onAbandon={handleAbandon}
        onSave={autoSave}
      />
    );
  }

  if (gameState === "result" && currentAlbum) {
    return (
      <TracklistResultScreen
        currentAlbum={currentAlbum}
        selectedArtist={selectedArtist}
        foundTrackIds={foundTrackIds}
        onReplay={resetGame}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
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
