import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import GameLayout from "@/components/GameLayout";
import { Colors } from "@/constants/Colors";
import { DeezerAlbum, DeezerArtist } from "@/services/deezer-api";

interface TracklistAlbumStepProps {
  sessionId: string | null;
  selectedArtist: DeezerArtist | null;
  candidateAlbums: DeezerAlbum[];
  loadingAlbum: boolean;
  onSelectAlbum: (album: DeezerAlbum) => Promise<void>;
  onBack: () => void;
  onSave: () => Promise<void>;
}

export default function TracklistAlbumStep({
  sessionId,
  selectedArtist,
  candidateAlbums,
  loadingAlbum,
  onSelectAlbum,
  onBack,
  onSave,
}: Readonly<TracklistAlbumStepProps>) {
  const artistName = selectedArtist?.name ?? "cet artiste";
  return (
    <GameLayout
      title="Tracklist"
      sessionId={sessionId}
      onSave={onSave}
      onBack={onBack}
    >
      <View style={styles.container}>
        <View style={styles.setupContainer}>
          <ThemedText type="title" style={styles.title}>
            Choisissez un album
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {artistName} — Quel album veux-tu trouver ?
          </ThemedText>

          <FlatList
            key="albums"
            data={candidateAlbums}
            numColumns={2}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.genreGrid}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.albumChoiceCard}
                onPress={() => onSelectAlbum(item)}
                disabled={loadingAlbum}
                accessibilityLabel={`Album ${item.title} de ${item.artist?.name ?? artistName}`}
                accessibilityRole="button"
              >
                <Image
                  source={{ uri: item.cover_medium }}
                  style={styles.albumChoiceCover}
                />
                <View style={styles.albumChoiceInfo}>
                  <ThemedText style={styles.albumChoiceTitle} numberOfLines={2}>
                    {item.title}
                  </ThemedText>
                  <ThemedText
                    style={styles.albumChoiceArtist}
                    numberOfLines={1}
                  >
                    {item.artist?.name ?? artistName}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            )}
          />

          {loadingAlbum && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary.survol} />
              <ThemedText style={styles.loadingText}>
                Chargement de l&apos;album...
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </GameLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
  },
  setupContainer: {
    flex: 1,
    padding: 20,
  },
  title: {
    textAlign: "center",
    marginBottom: 10,
    marginTop: 20,
  },
  subtitle: {
    textAlign: "center",
    color: Colors.game.textMuted,
    fontSize: 16,
    marginBottom: 20,
  },
  genreGrid: {
    paddingBottom: 20,
  },
  albumChoiceCard: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  albumChoiceCover: {
    width: "100%",
    aspectRatio: 1,
  },
  albumChoiceInfo: {
    padding: 8,
  },
  albumChoiceTitle: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  albumChoiceArtist: {
    color: Colors.game.textMuted,
    fontSize: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    marginTop: 15,
    fontSize: 16,
  },
});
