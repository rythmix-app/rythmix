import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import Header from "@/components/Header";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useParkeurGame } from "@/hooks/feature/parkeur/useParkeurGame";
import ParkeurModeSelection from "@/components/feature/parkeur/ParkeurModeSelection";
import ParkeurPlaylistSelection from "@/components/feature/parkeur/ParkeurPlaylistSelection";
import ParkeurArtistSelection from "@/components/feature/parkeur/ParkeurArtistSelection";
import ParkeurPlayingScreen from "@/components/feature/parkeur/ParkeurPlayingScreen";
import ParkeurResultScreen from "@/components/feature/parkeur/ParkeurResultScreen";
import ConfirmationModal from "@/components/ConfirmationModal";

export default function ParkeurGameScreen() {
  const {
    gameState,
    mode,
    setMode,
    playlists,
    loadingPlaylists,
    sessionId,
    rounds,
    currentRound,
    currentRoundIndex,
    score,
    answers,
    lastAnswer,
    startWithPlaylist,
    startWithArtist,
    submitAnswer,
    skipRound,
    goToNextRound,
    resetGame,
    abandonGame,
    saveCurrentState,
    errorMessage,
  } = useParkeurGame();
  const [isQuitModalVisible, setIsQuitModalVisible] = useState(false);

  const handleBackPress = () => {
    if (sessionId) {
      setIsQuitModalVisible(true);
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  const handleSaveAndQuit = () => {
    saveCurrentState();
    setIsQuitModalVisible(false);
    if (router.canGoBack()) router.back();
  };

  const handleAbandon = () => {
    setIsQuitModalVisible(false);
    abandonGame();
  };

  if (gameState === "selection") {
    if (mode === "pick") {
      return (
        <>
          <Header title="Parkeur" variant="withBack" />
          <ParkeurModeSelection onSelect={setMode} />
        </>
      );
    }
    if (mode === "playlist") {
      return (
        <>
          <Header
            title="Parkeur"
            variant="withBack"
            onBack={() => setMode("pick")}
          />
          <ParkeurPlaylistSelection
            playlists={playlists}
            loading={loadingPlaylists}
            errorMessage={errorMessage}
            onSelect={startWithPlaylist}
          />
        </>
      );
    }
    return (
      <>
        <Header
          title="Parkeur"
          variant="withBack"
          onBack={() => setMode("pick")}
        />
        <ParkeurArtistSelection
          errorMessage={errorMessage}
          onSelect={startWithArtist}
        />
      </>
    );
  }

  if (gameState === "loading") {
    return (
      <>
        <Header title="Parkeur" variant="withBack" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary.survol} />
          <ThemedText style={styles.loadingText}>
            Préparation de la partie…
          </ThemedText>
        </View>
      </>
    );
  }

  if (gameState === "result") {
    return (
      <ParkeurResultScreen
        rounds={rounds}
        answers={answers}
        score={score}
        maxScore={rounds.length}
        onReplay={resetGame}
      />
    );
  }

  if (!currentRound) {
    return (
      <>
        <Header title="Parkeur" variant="withBack" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary.survol} />
        </View>
      </>
    );
  }

  return (
    <>
      <Header title="Parkeur" variant="withBack" onBack={handleBackPress} />
      <ConfirmationModal
        visible={isQuitModalVisible}
        title="Quitter la partie ?"
        message="Tu peux sauvegarder pour reprendre plus tard, ou abandonner et voir ton score actuel."
        confirmLabel="Sauvegarder et quitter"
        secondaryLabel="Abandonner la partie"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={handleSaveAndQuit}
        onSecondary={handleAbandon}
        onCancel={() => setIsQuitModalVisible(false)}
      />
      <ParkeurPlayingScreen
        round={currentRound}
        roundIndex={currentRoundIndex}
        totalRounds={rounds.length}
        score={score}
        lastAnswer={lastAnswer}
        isReveal={gameState === "reveal"}
        onSubmit={submitAnswer}
        onSkip={skipRound}
        onNext={goToNextRound}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { color: "white" },
});
