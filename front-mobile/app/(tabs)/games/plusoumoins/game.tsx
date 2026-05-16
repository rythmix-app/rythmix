import React from "react";
import { usePlusOuMoinsGame } from "@/hooks/feature/plusoumoins/usePlusOuMoinsGame";
import { PlusOuMoinsSelectionScreen } from "@/components/feature/plusoumoins/PlusOuMoinsSelectionScreen";
import { PlusOuMoinsPlayingScreen } from "@/components/feature/plusoumoins/PlusOuMoinsPlayingScreen";
import { PlusOuMoinsResultScreen } from "@/components/feature/plusoumoins/PlusOuMoinsResultScreen";

export default function HigherOrLowerGameScreen() {
  const {
    gameState,
    mode,
    targetA,
    targetB,
    streak,
    bestStreakArtist,
    bestStreakAlbum,
    sessionId,
    isCorrect,
    revealOpacity,
    loadInitialData,
    handleGuess,
    resetGame,
    abandonGame,
    autoSave,
  } = usePlusOuMoinsGame();

  if (gameState === "selection") {
    return <PlusOuMoinsSelectionScreen onSelectMode={loadInitialData} />;
  }

  if (gameState === "result") {
    return (
      <PlusOuMoinsResultScreen
        streak={streak}
        bestStreakArtist={bestStreakArtist}
        bestStreakAlbum={bestStreakAlbum}
        mode={mode}
        onReplay={resetGame}
      />
    );
  }

  return (
    <PlusOuMoinsPlayingScreen
      gameState={gameState}
      mode={mode}
      targetA={targetA}
      targetB={targetB}
      streak={streak}
      isCorrect={isCorrect}
      revealOpacity={revealOpacity}
      sessionId={sessionId}
      onGuess={handleGuess}
      onAbandon={abandonGame}
      onSave={autoSave}
    />
  );
}
