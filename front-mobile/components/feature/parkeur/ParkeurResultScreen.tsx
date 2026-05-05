import { ScrollView, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";
import type { ParkeurAnswer, ParkeurRound } from "@/types/gameSession";

interface Props {
  rounds: ParkeurRound[];
  answers: ParkeurAnswer[];
  score: number;
  maxScore: number;
  onReplay: () => void;
}

function ratingFor(percentage: number): string {
  if (percentage >= 80) return "Excellent !";
  if (percentage >= 60) return "Très bien !";
  if (percentage >= 40) return "Pas mal !";
  return "Continue à t'entraîner !";
}

export default function ParkeurResultScreen({
  rounds,
  answers,
  score,
  maxScore,
  onReplay,
}: Props) {
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return (
    <>
      <Header title="Parkeur" variant="withBack" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.scoreSection}>
          <MaterialIcons
            name="emoji-events"
            size={64}
            color={Colors.primary.survol}
          />
          <ThemedText type="title" style={styles.scoreValue}>
            {score}/{maxScore}
          </ThemedText>
          <ThemedText style={styles.percentage}>{percentage}%</ThemedText>
          <ThemedText style={styles.rating}>{ratingFor(percentage)}</ThemedText>
        </View>

        <View style={styles.recapSection}>
          <ThemedText type="subtitle" style={styles.recapTitle}>
            Récapitulatif
          </ThemedText>
          {rounds.map((round, idx) => {
            const answer = answers[idx];
            const correct = answer?.correct ?? false;
            return (
              <View key={`${round.trackId}-${idx}`} style={styles.recapRow}>
                <MaterialIcons
                  name={correct ? "check-circle" : "cancel"}
                  size={20}
                  color={correct ? "#4ade80" : "#ff6b6b"}
                />
                <View style={styles.recapInfo}>
                  <ThemedText style={styles.recapArtist}>
                    {round.artist}
                  </ThemedText>
                  <ThemedText style={styles.recapTitleText}>
                    {round.title}
                  </ThemedText>
                  <ThemedText style={styles.recapExpected}>
                    « {round.answerLine} »
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Button title="Rejouer" onPress={onReplay} style={styles.cta} />
          <Button
            title="Retour aux jeux"
            variant="outline"
            onPress={() => router.replace("/games")}
            style={styles.cta}
          />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary.fondPremier },
  content: { padding: 20, paddingBottom: 40, gap: 24 },
  scoreSection: { alignItems: "center", paddingVertical: 30 },
  scoreValue: { marginTop: 14, color: "white" },
  percentage: { color: Colors.primary.survol, fontSize: 22, marginTop: 4 },
  rating: { color: "#bbb", marginTop: 6 },
  recapSection: { gap: 12 },
  recapTitle: { color: "white", marginBottom: 6 },
  recapRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: 12,
    borderRadius: 10,
  },
  recapInfo: { flex: 1 },
  recapArtist: {
    color: Colors.primary.survol,
    fontSize: 12,
    textTransform: "uppercase",
  },
  recapTitleText: { color: "white", fontSize: 14, fontWeight: "600" },
  recapExpected: { color: "#ccc", marginTop: 4, fontStyle: "italic" },
  actions: { gap: 12, marginTop: 20 },
  cta: { paddingVertical: 16 },
});
