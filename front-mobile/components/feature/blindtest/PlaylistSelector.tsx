import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { CuratedPlaylist } from "@/services/curatedPlaylistService";

interface PlaylistSelectorProps {
  playlists: CuratedPlaylist[];
  loading: boolean;
  disabled?: boolean;
  onSelect: (playlist: CuratedPlaylist) => void;
}

export default function PlaylistSelector({
  playlists,
  loading,
  disabled = false,
  onSelect,
}: PlaylistSelectorProps) {
  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Choisis la playlist
      </ThemedText>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.survol} />
        </View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => onSelect(item)}
              disabled={disabled}
              activeOpacity={0.7}
              testID={`playlist-row-${item.id}`}
            >
              {item.coverUrl ? (
                <Image source={{ uri: item.coverUrl }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder]} />
              )}
              <View style={styles.info}>
                <ThemedText type="title" style={styles.name} numberOfLines={1}>
                  {item.name}
                </ThemedText>
                <ThemedText style={styles.trackCount}>
                  {item.trackCount} morceaux
                </ThemedText>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    textAlign: "center",
    marginBottom: 20,
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    paddingBottom: 20,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    gap: 14,
  },
  cover: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  coverPlaceholder: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  info: {
    flex: 1,
  },
  name: {
    color: "white",
    fontSize: 22,
    lineHeight: 26,
  },
  trackCount: {
    color: "#999",
    fontSize: 14,
    marginTop: 4,
  },
});
