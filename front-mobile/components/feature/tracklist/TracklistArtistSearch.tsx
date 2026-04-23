import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import GameLayout from "@/components/GameLayout";
import ArtistSelector from "@/components/ArtistSelector";
import { Colors } from "@/constants/Colors";
import { DeezerArtist } from "@/services/deezer-api";

interface TracklistArtistSearchProps {
  sessionId: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loadingAlbum: boolean;
  onSelectArtist: (artist: DeezerArtist) => void;
  onSave: () => Promise<void>;
}

export default function TracklistArtistSearch({
  sessionId,
  searchQuery,
  setSearchQuery,
  loadingAlbum,
  onSelectArtist,
  onSave,
}: Readonly<TracklistArtistSearchProps>) {
  return (
    <GameLayout title="Tracklist" sessionId={sessionId} onSave={onSave}>
      <View style={styles.container}>
        <View style={styles.setupContainer}>
          <ThemedText type="title" style={styles.title}>
            Cherchez un artiste
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Entrez le nom d&apos;un artiste pour tester vos connaissances
          </ThemedText>

          <ArtistSelector
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onSelect={onSelectArtist}
            disabled={loadingAlbum}
          />

          {loadingAlbum && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary.survol} />
              <ThemedText style={styles.loadingText}>
                Chargement des albums...
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
