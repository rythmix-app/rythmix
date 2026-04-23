import { Image, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";
import { GameTrack } from "@/hooks/feature/blurchette/useBlurchetteGame";

interface BlurchetteResultScreenProps {
  currentTrack: GameTrack;
  foundCorrect: boolean;
  onReplay: () => void;
}

export default function BlurchetteResultScreen({
  currentTrack,
  foundCorrect,
  onReplay,
}: Readonly<BlurchetteResultScreenProps>) {
  return (
    <>
      <Header title="Blurchette" variant="withBack" />
      <View style={styles.container}>
        <View style={styles.resultContainer}>
          <ThemedText type="title" style={styles.title}>
            {foundCorrect ? "Bravo ! 🎉" : "Dommage ! 😔"}
          </ThemedText>

          <View style={styles.albumReveal}>
            <Image
              source={{ uri: currentTrack.track.album.cover_xl }}
              style={styles.revealImage}
            />
            <View style={styles.revealInfo}>
              <ThemedText style={styles.revealLabel}>
                {currentTrack.isAlbum ? "Album" : "Single"}
              </ThemedText>
              <ThemedText style={styles.albumTitle}>
                {currentTrack.isAlbum
                  ? currentTrack.track.album.title
                  : currentTrack.track.title}
              </ThemedText>
              <ThemedText style={styles.artistName}>
                {currentTrack.track.artist.name}
              </ThemedText>
            </View>
          </View>

          <View style={styles.resultActions}>
            <Button
              title="Rejouer"
              onPress={onReplay}
              style={styles.replayButton}
            />
            <Button
              title="Retour aux jeux"
              variant="outline"
              onPress={() => router.push("/games")}
            />
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
  },
  resultContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: 10,
    marginTop: 20,
  },
  albumReveal: {
    alignItems: "center",
    marginBottom: 30,
  },
  revealImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginBottom: 20,
  },
  revealInfo: {
    alignItems: "center",
  },
  revealLabel: {
    color: "#999",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  albumTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  artistName: {
    color: "#999",
    fontSize: 16,
    textAlign: "center",
  },
  resultActions: {
    gap: 12,
  },
  replayButton: {
    paddingVertical: 16,
  },
});
