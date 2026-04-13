import { Image, ScrollView, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";
import { DeezerTrack } from "@/services/deezer-api";

interface BlindtestRoundRevealProps {
  track: DeezerTrack;
  roundIndex: number;
  totalRounds: number;
  roundScore: number;
  maxRoundScore: number;
  artistCorrect: boolean;
  featuringNames: string[];
  featuringFoundNames: string[];
  titleCorrect: boolean;
  isLastRound: boolean;
  onNext: () => void;
}

export default function BlindtestRoundReveal({
  track,
  roundIndex,
  totalRounds,
  roundScore,
  maxRoundScore,
  artistCorrect,
  featuringNames,
  featuringFoundNames,
  titleCorrect,
  isLastRound,
  onNext,
}: BlindtestRoundRevealProps) {
  const coverUrl = track.album.cover_xl || track.album.cover_big;

  return (
    <>
      <Header title="Blind Test" variant="withBack" />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.container}
      >
        <ThemedText style={styles.roundLabel}>
          Manche {roundIndex + 1}/{totalRounds}
        </ThemedText>

        <Image source={{ uri: coverUrl }} style={styles.cover} />

        <ThemedText type="title" style={styles.artistName}>
          {track.artist.name}
        </ThemedText>
        <ThemedText style={styles.trackTitle}>{track.title}</ThemedText>

        <View style={styles.scoreCard}>
          <ThemedText style={styles.scoreTitle}>
            Score : {roundScore}/{maxRoundScore}
          </ThemedText>

          <ScoreRow label="Artiste" correct={artistCorrect} />
          {featuringNames.map((name) => (
            <ScoreRow
              key={name}
              label={`Feat. ${name}`}
              correct={featuringFoundNames.includes(name)}
            />
          ))}
          <ScoreRow label="Titre" correct={titleCorrect} />
        </View>

        <Button
          title={isLastRound ? "Voir les résultats" : "Manche suivante"}
          onPress={onNext}
          style={styles.nextButton}
        />
      </ScrollView>
    </>
  );
}

function ScoreRow({ label, correct }: { label: string; correct: boolean }) {
  return (
    <View style={styles.scoreRow}>
      <MaterialIcons
        name={correct ? "check-circle" : "cancel"}
        size={22}
        color={correct ? "#4CAF50" : "#ff6b6b"}
      />
      <ThemedText style={styles.scoreLabel}>{label}</ThemedText>
      <ThemedText
        style={[styles.scorePoints, { color: correct ? "#4CAF50" : "#ff6b6b" }]}
      >
        {correct ? "+1" : "0"}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
  },
  container: {
    alignItems: "center",
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  roundLabel: {
    color: "#999",
    fontSize: 14,
    marginBottom: 20,
  },
  cover: {
    width: 200,
    height: 200,
    borderRadius: 16,
    marginBottom: 20,
  },
  artistName: {
    textAlign: "center",
    marginBottom: 4,
  },
  trackTitle: {
    color: "#999",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 30,
  },
  scoreCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
    gap: 14,
    marginBottom: 30,
  },
  scoreTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scoreLabel: {
    color: "#CCC",
    fontSize: 16,
    flex: 1,
  },
  scorePoints: {
    fontSize: 16,
    fontWeight: "bold",
  },
  nextButton: {
    width: "100%",
    paddingVertical: 16,
  },
});
