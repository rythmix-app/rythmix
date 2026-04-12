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
import { DeezerGenre } from "@/services/deezer-api";

interface BlurchetteGenreSelectionProps {
  sessionId: string | null;
  genres: DeezerGenre[];
  loadingGenres: boolean;
  loadingTrack: boolean;
  onSelectGenre: (genre: DeezerGenre) => void;
  onSave: () => Promise<void>;
}

export default function BlurchetteGenreSelection({
  sessionId,
  genres,
  loadingGenres,
  loadingTrack,
  onSelectGenre,
  onSave,
}: BlurchetteGenreSelectionProps) {
  return (
    <GameLayout title="Blurchette" sessionId={sessionId} onSave={onSave}>
      <View style={styles.container}>
        <View style={styles.setupContainer}>
          <ThemedText type="title" style={styles.title}>
            Choisissez votre style
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Sélectionnez un genre musical pour commencer
          </ThemedText>

          {loadingGenres ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary.survol} />
            </View>
          ) : (
            <FlatList
              data={genres}
              numColumns={2}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.genreGrid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.genreCard}
                  onPress={() => onSelectGenre(item)}
                  disabled={loadingTrack}
                >
                  <Image
                    source={{ uri: item.picture_medium }}
                    style={styles.genreImage}
                  />
                  <View style={styles.genreOverlay}>
                    <ThemedText style={styles.genreName}>
                      {item.name}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}

          {loadingTrack && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary.survol} />
              <ThemedText style={styles.loadingText}>Chargement...</ThemedText>
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
    color: "#999",
    fontSize: 16,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  genreGrid: {
    paddingBottom: 20,
  },
  genreCard: {
    flex: 1,
    margin: 8,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  genreImage: {
    width: "100%",
    height: "100%",
  },
  genreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  genreName: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    paddingHorizontal: 10,
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
