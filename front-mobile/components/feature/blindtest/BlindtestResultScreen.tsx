import { Image, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";
import { BlindtestRound } from "@/types/gameSession";

interface BlindtestResultScreenProps {
  totalScore: number;
  maxScore: number;
  completedRounds: BlindtestRound[];
  onReplay: () => void;
}

export default function BlindtestResultScreen({
  totalScore,
  maxScore,
  completedRounds,
  onReplay,
}: BlindtestResultScreenProps) {
  const percentage =
    maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const getRating = () => {
    if (percentage >= 80) return "Excellent !";
    if (percentage >= 60) return "Très bien !";
    if (percentage >= 40) return "Pas mal !";
    return "Continue à t'entraîner !";
  };

  return (
    <>
      <Header title="Blind Test" variant="withBack" />
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
            {totalScore}/{maxScore}
          </ThemedText>
          <ThemedText style={styles.percentage}>{percentage}%</ThemedText>
          <ThemedText style={styles.rating}>{getRating()}</ThemedText>
        </View>

        <View style={styles.roundsSection}>
          <ThemedText type="subtitle" style={styles.roundsTitle}>
            Récapitulatif
          </ThemedText>

          {completedRounds.map((round, index) => (
            <View key={`${round.trackId}-${index}`} style={styles.roundRow}>
              <Image
                source={{ uri: round.coverUrl }}
                style={styles.roundCover}
              />
              <View style={styles.roundInfo}>
                <ThemedText style={styles.roundArtist} numberOfLines={1}>
                  {round.artistName}
                </ThemedText>
                <ThemedText style={styles.roundTrack} numberOfLines={1}>
                  {round.trackTitle}
                </ThemedText>
              </View>
              <View style={styles.roundScoreBadge}>
                <ThemedText style={styles.roundScoreText}>
                  {round.roundScore}/{2 + round.featuringNames.length}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Rejouer" onPress={onReplay} style={styles.button} />
          <Button
            title="Retour aux jeux"
            variant="outline"
            onPress={() => router.push("/games")}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  scoreSection: {
    alignItems: "center",
    marginBottom: 40,
    marginTop: 10,
  },
  scoreValue: {
    marginTop: 16,
    fontSize: 48,
    textAlign: "center",
  },
  percentage: {
    color: Colors.primary.survol,
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 4,
  },
  rating: {
    color: "#999",
    fontSize: 18,
    marginTop: 8,
  },
  roundsSection: {
    marginBottom: 30,
  },
  roundsTitle: {
    color: "white",
    fontSize: 20,
    marginBottom: 16,
  },
  roundRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  roundCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  roundInfo: {
    flex: 1,
  },
  roundArtist: {
    color: "white",
    fontSize: 15,
    fontFamily: "Bold",
    textTransform: "uppercase",
  },
  roundTrack: {
    color: "#999",
    fontSize: 13,
    marginTop: 2,
    fontFamily: "Bold",
    textTransform: "uppercase",
  },
  roundScoreBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roundScoreText: {
    color: Colors.primary.survol,
    fontSize: 14,
    fontWeight: "bold",
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
  },
});
