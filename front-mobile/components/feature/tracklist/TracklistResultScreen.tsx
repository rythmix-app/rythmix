import { Image, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";
import { DeezerArtist } from "@/services/deezer-api";
import { GameAlbum } from "@/hooks/feature/tracklist/useTracklistGame";

interface TracklistResultScreenProps {
  currentAlbum: GameAlbum;
  selectedArtist: DeezerArtist | null;
  foundTrackIds: Set<number>;
  onReplay: () => void;
}

export default function TracklistResultScreen({
  currentAlbum,
  selectedArtist,
  foundTrackIds,
  onReplay,
}: TracklistResultScreenProps) {
  const score = foundTrackIds.size;
  const maxScore = currentAlbum.tracks.length;
  const percentage = Math.round((score / maxScore) * 100);

  return (
    <>
      <Header title="Tracklist" variant="withBack" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.resultContent}
      >
        <View style={styles.resultHeader}>
          <ThemedText type="title" style={styles.resultTitle}>
            {percentage >= 75
              ? "Excellent ! 🎉"
              : percentage >= 50
                ? "Bien joué ! 👍"
                : "Continuez à vous entraîner ! 💪"}
          </ThemedText>

          <View style={styles.scoreCard}>
            <ThemedText style={styles.scoreText}>
              {score} / {maxScore}
            </ThemedText>
            <ThemedText style={styles.scoreLabel}>
              Titres trouvés ({percentage}%)
            </ThemedText>
          </View>

          <View style={styles.albumReveal}>
            <Image
              source={{ uri: currentAlbum.album.cover_xl }}
              style={styles.revealImage}
            />
            <ThemedText style={styles.revealAlbumTitle}>
              {currentAlbum.album.title}
            </ThemedText>
            <ThemedText style={styles.revealArtistName}>
              {currentAlbum.album.artist?.name ?? selectedArtist?.name}
            </ThemedText>
          </View>
        </View>

        <View style={styles.comparisonSection}>
          <ThemedText style={styles.comparisonTitle}>
            Titres de l&apos;album
          </ThemedText>
          <View style={styles.trackResultList}>
            {currentAlbum.tracks.map((track, index) => {
              const isFound = foundTrackIds.has(track.id);
              return (
                <View key={track.id} style={styles.trackResultItem}>
                  <MaterialIcons
                    name={isFound ? "check-circle" : "cancel"}
                    size={20}
                    color={isFound ? Colors.game.success : Colors.game.error}
                  />
                  <ThemedText style={styles.trackResultNumber}>
                    {index + 1}.
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.trackResultText,
                      isFound && styles.answerCorrect,
                      !isFound && styles.answerIncorrect,
                    ]}
                  >
                    {track.title}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.resultActions}>
          <Button title="Rejouer" onPress={onReplay} />
          <Button
            title="Retour aux jeux"
            variant="outline"
            onPress={() => router.push("/games")}
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
  resultContent: {
    padding: 20,
    paddingBottom: 40,
  },
  resultHeader: {
    alignItems: "center",
    marginBottom: 30,
  },
  resultTitle: {
    textAlign: "center",
    marginBottom: 20,
  },
  scoreCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.primary.survol,
  },
  scoreText: {
    color: Colors.primary.survol,
    fontSize: 48,
    fontWeight: "bold",
    lineHeight: 58,
  },
  scoreLabel: {
    color: "white",
    fontSize: 16,
    marginTop: 5,
  },
  albumReveal: {
    alignItems: "center",
  },
  revealImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginBottom: 15,
  },
  revealAlbumTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  revealArtistName: {
    color: Colors.game.textMuted,
    fontSize: 16,
    textAlign: "center",
  },
  comparisonSection: {
    marginBottom: 30,
  },
  comparisonTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  trackResultList: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 15,
  },
  trackResultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  trackResultNumber: {
    color: Colors.game.textMuted,
    fontSize: 14,
    minWidth: 25,
  },
  trackResultText: {
    fontSize: 14,
    fontFamily: "Bold",
    textTransform: "uppercase",
    flex: 1,
  },
  answerCorrect: {
    color: Colors.game.success,
  },
  answerIncorrect: {
    color: Colors.game.error,
  },
  resultActions: {
    gap: 12,
  },
});
