import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";
import { useBlindtestGame } from "@/hooks/feature/blindtest/useBlindtestGame";
import BlindtestGenreSelection from "@/components/feature/blindtest/BlindtestGenreSelection";
import BlindtestReadyScreen from "@/components/feature/blindtest/BlindtestReadyScreen";
import BlindtestPlayingScreen from "@/components/feature/blindtest/BlindtestPlayingScreen";
import BlindtestRoundReveal from "@/components/feature/blindtest/BlindtestRoundReveal";
import BlindtestResultScreen from "@/components/feature/blindtest/BlindtestResultScreen";

export default function BlindtestGameScreen() {
  const {
    gameState,
    genres,
    loadingGenres,
    loadingTracks,
    currentTrack,
    currentFeaturingNames,
    currentRoundIndex,
    totalRounds,
    timeRemaining,
    roundDuration,
    answerInput,
    setAnswerInput,
    artistFound,
    foundFeaturings,
    titleFound,
    warmMessage,
    completedRounds,
    tracks,
    sessionId,
    sessionError,
    audioPlayer,
    shakeAnimation,
    borderOpacity,
    errorMessage,
    errorAnimationsEnabled,
    startGame,
    beginPlaying,
    submitAnswer,
    nextRound,
    handleAbandon,
    resetGame,
    autoSave,
    getRoundMaxScore,
  } = useBlindtestGame();

  if (sessionError) {
    return (
      <>
        <Header title="Blind Test" variant="withBack" />
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
      <BlindtestGenreSelection
        sessionId={sessionId}
        genres={genres}
        loadingGenres={loadingGenres}
        loadingTracks={loadingTracks}
        onSelectGenre={startGame}
        onSave={autoSave}
      />
    );
  }

  if (gameState === "ready") {
    return (
      <BlindtestReadyScreen
        totalRounds={totalRounds}
        loading={loadingTracks}
        onStart={beginPlaying}
      />
    );
  }

  if (gameState === "playing" && currentTrack) {
    return (
      <BlindtestPlayingScreen
        sessionId={sessionId}
        currentRoundIndex={currentRoundIndex}
        totalRounds={totalRounds}
        timeRemaining={timeRemaining}
        roundDuration={roundDuration}
        answerInput={answerInput}
        setAnswerInput={setAnswerInput}
        artistFound={artistFound}
        artistName={currentTrack.artist.name}
        featuringNames={currentFeaturingNames}
        foundFeaturings={foundFeaturings}
        titleFound={titleFound}
        trackTitle={currentTrack.title_short || currentTrack.title}
        isPlaying={audioPlayer.isPlaying}
        shakeAnimation={shakeAnimation}
        borderOpacity={borderOpacity}
        errorMessage={errorMessage}
        errorAnimationsEnabled={errorAnimationsEnabled}
        warmMessage={warmMessage}
        onSubmitAnswer={submitAnswer}
        onAbandon={handleAbandon}
        onSave={autoSave}
      />
    );
  }

  if (gameState === "roundReveal" && currentTrack) {
    const lastRound = completedRounds[completedRounds.length - 1];
    const maxRoundScore = getRoundMaxScore(currentTrack);
    return (
      <BlindtestRoundReveal
        track={currentTrack}
        roundIndex={currentRoundIndex}
        totalRounds={totalRounds}
        roundScore={lastRound?.roundScore ?? 0}
        maxRoundScore={maxRoundScore}
        artistCorrect={lastRound?.artistCorrect ?? false}
        featuringNames={lastRound?.featuringNames ?? []}
        featuringFoundNames={lastRound?.featuringFoundNames ?? []}
        titleCorrect={lastRound?.titleCorrect ?? false}
        isLastRound={currentRoundIndex >= totalRounds - 1}
        onNext={nextRound}
      />
    );
  }

  if (gameState === "result") {
    const totalScore = completedRounds.reduce((s, r) => s + r.roundScore, 0);
    const maxScore = tracks.reduce((s, t) => s + getRoundMaxScore(t), 0);
    return (
      <BlindtestResultScreen
        totalScore={totalScore}
        maxScore={maxScore}
        completedRounds={completedRounds}
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
