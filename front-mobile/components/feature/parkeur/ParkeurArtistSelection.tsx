import { useEffect, useRef, useState } from "react";
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
import {
  searchDeezerArtists,
  type DeezerArtistSearchResult,
} from "@/services/parkeurService";
import type { ParkeurArtist } from "@/hooks/feature/parkeur/useParkeurGame";

interface Props {
  errorMessage: string | null;
  onSelect: (artist: ParkeurArtist) => void;
}

const SEARCH_DEBOUNCE_MS = 350;

export default function ParkeurArtistSelection({
  errorMessage,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DeezerArtistSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchDeezerArtists(trimmed);
        if (requestIdRef.current !== requestId) return;
        setResults(data);
        setSearchError(null);
      } catch (err) {
        console.error("[Parkeur] Artist search failed:", err);
        if (requestIdRef.current !== requestId) return;
        setSearchError("Recherche impossible. Réessaie plus tard.");
        setResults([]);
      } finally {
        if (requestIdRef.current === requestId) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Cherche un artiste
      </ThemedText>
      {errorMessage && (
        <View style={styles.errorBanner}>
          <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
        </View>
      )}
      <View style={styles.searchRow}>
        <MaterialIcons
          name="search"
          size={20}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          placeholder="Tape un nom d'artiste…"
          placeholderTextColor="#666"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Recherche d'artiste"
        />
      </View>

      {searching && (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color={Colors.primary.survol} />
          <ThemedText style={styles.statusText}>Recherche…</ThemedText>
        </View>
      )}

      {!searching && searchError && (
        <ThemedText style={styles.errorText}>{searchError}</ThemedText>
      )}

      {!searching &&
        !searchError &&
        query.trim().length >= 2 &&
        results.length === 0 && (
          <ThemedText style={styles.emptyText}>
            Aucun artiste trouvé pour « {query.trim()} ».
          </ThemedText>
        )}

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.artistRow}
            activeOpacity={0.7}
            onPress={() =>
              onSelect({
                id: item.id,
                name: item.name,
                pictureUrl: item.picture_medium ?? item.picture,
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`Démarrer une partie sur ${item.name}`}
          >
            {item.picture_medium ? (
              <Image
                source={{ uri: item.picture_medium }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialIcons name="person" size={26} color="#666" />
              </View>
            )}
            <View style={styles.info}>
              <ThemedText style={styles.name}>{item.name}</ThemedText>
              {typeof item.nb_fan === "number" && (
                <ThemedText style={styles.meta}>
                  {item.nb_fan.toLocaleString("fr-FR")} fans
                </ThemedText>
              )}
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#666" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
    padding: 20,
  },
  title: { color: "white", marginBottom: 12 },
  errorBanner: {
    backgroundColor: "rgba(255, 107, 107, 0.15)",
    borderColor: "#ff6b6b",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: "#ff6b6b" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: "white", fontSize: 15 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  statusText: { color: "#999", fontSize: 13 },
  emptyText: { color: "#999", textAlign: "center", marginTop: 24 },
  listContent: { paddingBottom: 40, gap: 10 },
  artistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#222" },
  avatarPlaceholder: {
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  info: { flex: 1 },
  name: { color: "white", fontSize: 16, fontWeight: "600" },
  meta: { color: "#999", fontSize: 12, marginTop: 2 },
});
