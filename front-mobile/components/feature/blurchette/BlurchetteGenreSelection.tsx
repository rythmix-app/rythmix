import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import GameLayout from "@/components/GameLayout";
import GenreSelector from "@/components/GenreSelector";
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
          <GenreSelector
            genres={genres}
            loading={loadingGenres}
            disabled={loadingTrack}
            onSelect={onSelectGenre}
          />

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
