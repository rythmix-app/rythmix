import React from "react";
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import GameLayout from "@/components/GameLayout";
import {
  GameMode,
  PlusOuMoinsGameState,
  TargetData,
} from "@/hooks/feature/plusoumoins/usePlusOuMoinsGame";

interface PlusOuMoinsPlayingScreenProps {
  gameState: PlusOuMoinsGameState;
  mode: GameMode;
  targetA: TargetData | null;
  targetB: TargetData | null;
  streak: number;
  isCorrect: boolean | null;
  revealOpacity: SharedValue<number>;
  sessionId: string | null;
  onGuess: (guess: "higher" | "lower") => void;
  onAbandon: () => void;
  onSave: () => void;
}

export function PlusOuMoinsPlayingScreen({
  gameState,
  mode,
  targetA,
  targetB,
  streak,
  isCorrect,
  revealOpacity,
  sessionId,
  onGuess,
  onAbandon,
  onSave,
}: PlusOuMoinsPlayingScreenProps) {
  const formatNumber = (num: number) => num.toLocaleString("fr-FR");
  const revealStyle = useAnimatedStyle(() => ({
    opacity: revealOpacity.value,
  }));

  if (gameState === "loading") {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary.survol} />
        <ThemedText style={styles.loadingText}>
          Préparation du duel...
        </ThemedText>
      </View>
    );
  }

  return (
    <GameLayout title="Plus ou moins" sessionId={sessionId} onSave={onSave}>
      <View style={styles.container}>
        <View style={styles.gameHeader}>
          <View style={styles.levelInfo}>
            <View style={styles.levelBadge}>
              <ThemedText style={styles.levelText}>Série : {streak}</ThemedText>
            </View>
            <ThemedText style={styles.hintText}>
              {mode === "artist"
                ? "Qui a le plus d'auditeurs ?"
                : "Lequel a le plus d'écoutes ?"}
            </ThemedText>
            <TouchableOpacity onPress={onAbandon}>
              <MaterialIcons name="close" size={24} color="#ff6b6b" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.gameArea}>
          <TouchableOpacity
            style={styles.clickableArea}
            activeOpacity={0.8}
            onPress={() => onGuess("lower")}
            disabled={gameState !== "playing"}
          >
            <View style={styles.stylizedCard}>
              <View style={styles.profileBubble}>
                <Image
                  source={{ uri: targetA?.image }}
                  style={styles.bubbleImage}
                />
              </View>
              <ThemedText style={styles.artistName}>{targetA?.name}</ThemedText>
              <View style={styles.scoreContainer}>
                <ThemedText style={styles.fansCount}>
                  {formatNumber(targetA?.score || 0)}
                </ThemedText>
              </View>
              <ThemedText style={styles.fansLabel}>
                {mode === "artist" ? "auditeurs mensuels" : "fans"}
              </ThemedText>
            </View>
          </TouchableOpacity>
          <View style={styles.vsContainer}>
            <View style={styles.vsLine} />
            <View style={styles.vsCircle}>
              <ThemedText style={styles.vsText}>VS</ThemedText>
            </View>
            <View style={styles.vsLine} />
          </View>
          <TouchableOpacity
            style={styles.clickableArea}
            activeOpacity={0.8}
            onPress={() => onGuess("higher")}
            disabled={gameState !== "playing"}
          >
            <View style={styles.stylizedCard}>
              <View style={styles.profileBubble}>
                <Image
                  source={{ uri: targetB?.image }}
                  style={styles.bubbleImage}
                />
                {isCorrect !== null && (
                  <View style={styles.feedbackOverlay}>
                    <MaterialIcons
                      name={isCorrect ? "check-circle" : "cancel"}
                      size={60}
                      color={isCorrect ? "#4CAF50" : "#F44336"}
                    />
                  </View>
                )}
              </View>
              <ThemedText style={styles.artistName}>{targetB?.name}</ThemedText>
              <View style={styles.scoreContainer}>
                {gameState === "playing" ? (
                  <ThemedText style={styles.fansCountHidden}>???</ThemedText>
                ) : (
                  <Animated.View style={revealStyle}>
                    <ThemedText style={styles.fansCount}>
                      {formatNumber(targetB?.score || 0)}
                    </ThemedText>
                  </Animated.View>
                )}
              </View>
              <ThemedText style={styles.fansLabel}>
                {mode === "artist" ? "auditeurs mensuels" : "fans"}
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </GameLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary.fondPremier },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primary.fondPremier,
  },
  loadingText: { color: "white", marginTop: 15, fontSize: 16 },
  gameHeader: { padding: 20, backgroundColor: "rgba(0, 0, 0, 0.5)", gap: 12 },
  levelInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  levelBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  levelText: { color: "white", fontSize: 14, fontWeight: "bold" },
  hintText: { color: "white", fontSize: 18, fontWeight: "bold" },
  gameArea: { flex: 1, paddingVertical: 5 },
  clickableArea: { flex: 1, paddingHorizontal: 20, paddingVertical: 5 },
  stylizedCard: {
    flex: 1,
    backgroundColor: "#1A2B2C",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  profileBubble: {
    width: 90,
    height: 100,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "rgba(79, 209, 217, 0.3)",
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "#2A3B3C",
    position: "relative",
  },
  bubbleImage: { width: "100%", height: "100%" },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  artistName: {
    color: "white",
    fontSize: 22,
    fontFamily: "Bold",
    textAlign: "center",
    marginBottom: 2,
  },
  fansCount: {
    color: "#4FD1D9",
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    paddingTop: 8,
    lineHeight: 36,
  },
  fansCountHidden: {
    color: "white",
    fontSize: 30,
    fontWeight: "bold",
    opacity: 0.2,
    paddingTop: 8,
  },
  fansLabel: {
    color: "#667A7B",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  scoreContainer: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  vsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 24,
    paddingHorizontal: 40,
  },
  vsLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  vsCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary.fondPremier,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  vsText: { color: "white", fontSize: 12, fontFamily: "Bold", opacity: 0.8 },
});
