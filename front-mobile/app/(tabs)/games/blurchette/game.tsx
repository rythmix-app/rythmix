import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";
import { useBlurchetteGame } from "@/hooks/feature/blurchette/useBlurchetteGame";
import BlurchetteGenreSelection from "@/components/feature/blurchette/BlurchetteGenreSelection";
import BlurchettePlayingScreen from "@/components/feature/blurchette/BlurchettePlayingScreen";
import BlurchetteResultScreen from "@/components/feature/blurchette/BlurchetteResultScreen";

export default function BlurchetteGameScreen() {
  const {
    gameState,
    genres,
    loadingGenres,
    loadingTrack,
    currentTrack,
    blurLevel,
    answer,
    setAnswer,
    foundCorrect,
    sessionId,
    sessionError,
    albumScale,
    albumOpacity,
    shakeAnimation,
    borderOpacity,
    errorMessage,
    errorAnimationsEnabled,
    startGame,
    submitAnswer,
    handleAbandon,
    resetGame,
    autoSave,
  } = useBlurchetteGame();

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
      <BlurchetteGenreSelection
        sessionId={sessionId}
        genres={genres}
        loadingGenres={loadingGenres}
        loadingTrack={loadingTrack}
        onSelectGenre={startGame}
        onSave={autoSave}
      />
    );
  }

  if (gameState === "playing" && currentTrack) {
    return (
      <BlurchettePlayingScreen
        sessionId={sessionId}
        currentTrack={currentTrack}
        blurLevel={blurLevel}
        answer={answer}
        setAnswer={setAnswer}
        albumScale={albumScale}
        albumOpacity={albumOpacity}
        shakeAnimation={shakeAnimation}
        borderOpacity={borderOpacity}
        errorMessage={errorMessage}
        errorAnimationsEnabled={errorAnimationsEnabled}
        onSubmitAnswer={submitAnswer}
        onAbandon={handleAbandon}
        onSave={autoSave}
      />
    );
  }

  if (gameState === "result" && currentTrack) {
    return (
      <BlurchetteResultScreen
        currentTrack={currentTrack}
        foundCorrect={foundCorrect}
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
