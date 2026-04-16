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
import { DeezerGenre } from "@/services/deezer-api";

interface GenreSelectorProps {
  genres: DeezerGenre[];
  loading: boolean;
  disabled?: boolean;
  onSelect: (genre: DeezerGenre) => void;
  title?: string;
  subtitle?: string;
}

export default function GenreSelector({
  genres,
  loading,
  disabled = false,
  onSelect,
  title = "Choisissez votre style",
  subtitle = "Sélectionnez un genre musical pour commencer",
}: GenreSelectorProps) {
  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>

      {loading ? (
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
              onPress={() => onSelect(item)}
              disabled={disabled}
            >
              <Image
                source={{ uri: item.picture_medium }}
                style={styles.genreImage}
              />
              <View style={styles.genreOverlay}>
                <ThemedText style={styles.genreName}>{item.name}</ThemedText>
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
});
