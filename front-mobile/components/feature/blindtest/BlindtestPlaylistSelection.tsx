import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import GameLayout from "@/components/GameLayout";
import PlaylistSelector from "@/components/feature/blindtest/PlaylistSelector";
import { Colors } from "@/constants/Colors";
import { CuratedPlaylist } from "@/services/curatedPlaylistService";

interface BlindtestPlaylistSelectionProps {
  sessionId: string | null;
  playlists: CuratedPlaylist[];
  loadingPlaylists: boolean;
  loadingTracks: boolean;
  onSelectPlaylist: (playlist: CuratedPlaylist) => void;
  onSave: () => Promise<void>;
}

export default function BlindtestPlaylistSelection({
  sessionId,
  playlists,
  loadingPlaylists,
  loadingTracks,
  onSelectPlaylist,
  onSave,
}: BlindtestPlaylistSelectionProps) {
  return (
    <GameLayout title="Blind Test" sessionId={sessionId} onSave={onSave}>
      <View style={styles.container}>
        <View style={styles.setupContainer}>
          <PlaylistSelector
            playlists={playlists}
            loading={loadingPlaylists}
            disabled={loadingTracks}
            onSelect={onSelectPlaylist}
          />

          {loadingTracks && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary.survol} />
              <ThemedText style={styles.loadingText}>
                Chargement des morceaux...
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
