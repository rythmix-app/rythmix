import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import type { CuratedPlaylist } from "@/services/curatedPlaylistService";

interface Props {
  playlists: CuratedPlaylist[];
  loading: boolean;
  errorMessage: string | null;
  onSelect: (playlist: CuratedPlaylist) => void;
}

export default function ParkeurPlaylistSelection({
  playlists,
  loading,
  errorMessage,
  onSelect,
}: Props) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary.survol} />
        <ThemedText style={styles.loadingText}>
          Chargement des playlists...
        </ThemedText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedText type="title" style={styles.title}>
        Choisis une playlist
      </ThemedText>
      {errorMessage && (
        <View style={styles.errorBanner}>
          <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
        </View>
      )}
      {playlists.map((playlist) => (
        <TouchableOpacity
          key={playlist.id}
          style={styles.playlistRow}
          onPress={() => onSelect(playlist)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Démarrer une partie sur ${playlist.name}`}
        >
          {playlist.coverUrl ? (
            <Image source={{ uri: playlist.coverUrl }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]} />
          )}
          <View style={styles.info}>
            <ThemedText style={styles.name}>{playlist.name}</ThemedText>
            <ThemedText style={styles.genre}>{playlist.genreLabel}</ThemedText>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary.fondPremier },
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  title: { marginBottom: 16, color: "white" },
  center: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: "white", marginTop: 12 },
  errorBanner: {
    backgroundColor: "rgba(255, 107, 107, 0.15)",
    borderColor: "#ff6b6b",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: "#ff6b6b" },
  playlistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#222",
  },
  coverPlaceholder: { backgroundColor: "#333" },
  info: { flex: 1 },
  name: { color: "white", fontSize: 16, fontWeight: "600" },
  genre: { color: "#999", fontSize: 13, marginTop: 2 },
});
