import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { DeezerArtist } from "@/services/deezer-api";
import { useArtistSearch } from "@/hooks/useArtistSearch";

interface ArtistSelectorProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (artist: DeezerArtist) => void;
  disabled?: boolean;
}

export default function ArtistSelector({
  query,
  onQueryChange,
  onSelect,
  disabled = false,
}: ArtistSelectorProps) {
  const { topArtists, searchResults, isSearching, isInitialLoading, hasQuery } =
    useArtistSearch(query);

  const data = hasQuery ? searchResults : topArtists;

  return (
    <>
      <View style={styles.searchContainer}>
        <MaterialIcons
          name="search"
          size={24}
          color={Colors.game.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un artiste..."
          placeholderTextColor={Colors.game.textMuted}
          value={query}
          onChangeText={onQueryChange}
          autoCorrect={false}
          editable={!disabled}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => onQueryChange("")}
            style={styles.clearButton}
            disabled={disabled}
          >
            <MaterialIcons
              name="close"
              size={20}
              color={Colors.game.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {isSearching || isInitialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.survol} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.artistList}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            !hasQuery && topArtists.length > 0 ? (
              <ThemedText style={styles.sectionTitle}>
                Artistes populaires en France
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.artistListItem}
              onPress={() => onSelect(item)}
              disabled={disabled}
            >
              <Image
                source={{ uri: item.picture_medium }}
                style={styles.artistListImage}
              />
              <View style={styles.artistListInfo}>
                <ThemedText style={styles.artistListName}>
                  {item.name}
                </ThemedText>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={Colors.game.textMuted}
              />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <ThemedText style={styles.emptyText}>
              {hasQuery
                ? "Aucun artiste trouvé"
                : "Aucune suggestion disponible"}
            </ThemedText>
          }
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: Colors.dark.text,
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  artistList: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginTop: 10,
    marginBottom: 15,
  },
  artistListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  artistListImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  artistListInfo: {
    flex: 1,
  },
  artistListName: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.dark.text,
  },
  emptyText: {
    textAlign: "center",
    color: Colors.game.textMuted,
    marginTop: 40,
    fontSize: 16,
  },
});
