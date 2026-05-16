import React from "react";
import { StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import Header from "@/components/Header";
import Button from "@/components/Button";
import { GameMode } from "@/hooks/feature/plusoumoins/usePlusOuMoinsGame";

interface PlusOuMoinsResultScreenProps {
  streak: number;
  bestStreakArtist: number;
  bestStreakAlbum: number;
  mode: GameMode;
  onReplay: () => void;
}

export function PlusOuMoinsResultScreen({
  streak,
  bestStreakArtist,
  bestStreakAlbum,
  mode,
  onReplay,
}: PlusOuMoinsResultScreenProps) {
  const currentBest = mode === "artist" ? bestStreakArtist : bestStreakAlbum;

  return (
    <View style={styles.container}>
      <Header title="Résultat" variant="withBack" />
      <View style={styles.resultContent}>
        <MaterialIcons
          name="emoji-events"
          size={100}
          color={Colors.primary.survol}
        />
        <ThemedText type="title" style={styles.resultTitle}>
          Partie terminée !
        </ThemedText>
        <View style={styles.scoreBoard}>
          <View style={styles.scoreItem}>
            <ThemedText style={styles.scoreLabel}>SÉRIE ACTUELLE</ThemedText>
            <ThemedText style={styles.scoreValue}>{streak}</ThemedText>
          </View>
          <View style={styles.scoreItem}>
            <ThemedText style={styles.scoreLabel}>MEILLEURE SÉRIE</ThemedText>
            <ThemedText style={styles.scoreValue}>{currentBest}</ThemedText>
          </View>
        </View>
        <Button
          title="Rejouer"
          onPress={onReplay}
          style={styles.replayButton}
        />
        <Button
          title="Quitter"
          variant="outline"
          onPress={() => router.back()}
          style={styles.exitButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary.fondPremier },
  resultContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  resultTitle: {
    fontSize: 32,
    marginTop: 10,
    marginBottom: 40,
    textAlign: "center",
    color: "white",
    fontFamily: "Bold",
  },
  scoreBoard: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    marginBottom: 50,
    paddingVertical: 10,
  },
  scoreItem: { alignItems: "center", paddingVertical: 10 },
  scoreLabel: {
    color: "#999",
    fontSize: 12,
    marginBottom: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "bold",
    color: "white",
    lineHeight: 54,
    paddingTop: 10,
  },
  replayButton: { width: "100%", marginBottom: 15 },
  exitButton: { width: "100%" },
});
