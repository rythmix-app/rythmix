import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import Button from "@/components/Button";
import ArtistSelector from "@/components/ArtistSelector";
import { Colors } from "@/constants/Colors";
import { useToast } from "@/components/Toast";
import { DeezerArtist, deezerAPI } from "@/services/deezer-api";
import {
  getOnboardingSpotifySuggestions,
  getMyOnboardingArtists,
  setMyOnboardingArtists,
} from "@/services/onboardingService";
import {
  invalidateOnboardingStatus,
  setOnboardingStatusFromResponse,
  useOnboardingStatus,
} from "@/hooks/useOnboardingStatus";
import { useSpotifyIntegration } from "@/hooks/useSpotifyIntegration";
import {
  MAX_ONBOARDING_ARTISTS,
  MIN_ONBOARDING_ARTISTS,
  OnboardingArtistSuggestion,
} from "@/types/onboarding";

type OnboardingMode = "pitch" | "spotify" | "manual";
const SPOTIFY_GREEN = "#1ED760";

export default function OnboardingArtistsScreen() {
  const { show } = useToast();
  const { refresh } = useOnboardingStatus();
  const {
    status: spotifyStatus,
    isLoading: spotifyLoading,
    isConnecting,
    connect,
  } = useSpotifyIntegration();

  const [mode, setMode] = useState<OnboardingMode>("pitch");
  const [selectedById, setSelectedById] = useState<
    Map<number, OnboardingArtistSuggestion>
  >(new Map());
  const [spotifyArtists, setSpotifyArtists] = useState<
    OnboardingArtistSuggestion[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingSelection, setLoadingSelection] = useState(true);
  const [loadingSpotify, setLoadingSpotify] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const current = await getMyOnboardingArtists();
        if (cancelled) return;
        const enriched = await enrichSelection(current);
        if (cancelled) return;
        const map = new Map<number, OnboardingArtistSuggestion>();
        enriched.forEach((artist) => map.set(artist.id, artist));
        setSelectedById(map);
      } catch (error) {
        console.error("Failed to load existing selection:", error);
      } finally {
        if (!cancelled) setLoadingSelection(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (spotifyLoading || loadingSelection || mode !== "pitch") return;
    if (spotifyStatus?.connected) {
      setMode("spotify");
    } else if (selectedById.size > 0) {
      setMode("manual");
    }
  }, [
    spotifyLoading,
    loadingSelection,
    spotifyStatus,
    mode,
    selectedById.size,
  ]);

  useEffect(() => {
    if (mode !== "spotify" || !spotifyStatus?.connected) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoadingSpotify(true);
        const artists = await getOnboardingSpotifySuggestions();
        if (cancelled) return;
        setSpotifyArtists(artists);
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load Spotify suggestions:", error);
        show({
          type: "error",
          message: "Impossible de récupérer tes artistes Spotify",
        });
        setMode("manual");
      } finally {
        if (!cancelled) setLoadingSpotify(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [mode, spotifyStatus?.connected, show]);

  const selectedCount = selectedById.size;
  const canValidate =
    selectedCount >= MIN_ONBOARDING_ARTISTS &&
    selectedCount <= MAX_ONBOARDING_ARTISTS;
  const maxReached = selectedCount >= MAX_ONBOARDING_ARTISTS;

  const selectedIds = useMemo(
    () => new Set(selectedById.keys()),
    [selectedById],
  );

  const selectedList = useMemo(
    () => Array.from(selectedById.values()),
    [selectedById],
  );

  const pinnedDeezerArtists = useMemo(
    () => selectedList.map(suggestionToDeezerArtist),
    [selectedList],
  );

  const toggle = (artist: OnboardingArtistSuggestion) => {
    setSelectedById((current) => {
      const next = new Map(current);
      if (next.has(artist.id)) {
        next.delete(artist.id);
      } else if (next.size < MAX_ONBOARDING_ARTISTS) {
        next.set(artist.id, artist);
      }
      return next;
    });
  };

  const handleValidate = async () => {
    if (!canValidate || submitting) return;
    const ids = selectedList.map((artist) => artist.id);
    try {
      setSubmitting(true);
      await setMyOnboardingArtists(ids);
      setOnboardingStatusFromResponse({
        completed: true,
        artistsCount: ids.length,
      });
      show({
        type: "success",
        message: "Tes artistes favoris sont enregistrés",
      });
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Failed to save onboarding artists:", error);
      invalidateOnboardingStatus();
      void refresh();
      show({ type: "error", message: "Impossible d'enregistrer ta sélection" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConnectSpotify = async () => {
    const result = await connect();
    if (result === "ok") {
      setMode("spotify");
    } else if (result === "error") {
      show({ type: "error", message: "Échec de la connexion Spotify" });
    }
  };

  const handleSkipToManual = () => {
    setMode("manual");
  };

  const handleSkip = () => {
    router.replace("/(tabs)");
  };

  const counterSuffix = canValidate
    ? " ✓"
    : selectedCount < MIN_ONBOARDING_ARTISTS
      ? ` · minimum ${MIN_ONBOARDING_ARTISTS} pour valider`
      : ` · maximum ${MAX_ONBOARDING_ARTISTS}`;

  if (loadingSelection || spotifyLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.survol} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {mode === "pitch" ? (
        <PitchView
          isConnecting={isConnecting}
          onConnect={handleConnectSpotify}
          onManual={handleSkipToManual}
          onLater={handleSkip}
        />
      ) : (
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Tes artistes favoris</Text>
            <Text style={styles.subtitle}>
              {mode === "spotify"
                ? "On a récupéré tes top artistes Spotify. Sélectionne 3 à 5 artistes."
                : "Cherche tes artistes favoris et sélectionne 3 à 5 artistes."}
            </Text>
            <Text style={styles.counter}>
              {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
              {counterSuffix}
            </Text>
          </View>

          {mode === "spotify" ? (
            <SpotifyArtistsList
              loading={loadingSpotify}
              pinnedArtists={selectedList}
              suggestions={spotifyArtists}
              selectedIds={selectedIds}
              maxReached={maxReached}
              onToggle={toggle}
            />
          ) : (
            <View style={styles.manualContainer}>
              <ArtistSelector
                query={searchQuery}
                onQueryChange={setSearchQuery}
                onSelect={(artist: DeezerArtist) =>
                  toggle(toSuggestion(artist))
                }
                selectedIds={selectedIds}
                maxReached={maxReached}
                pinnedArtists={pinnedDeezerArtists}
              />
            </View>
          )}

          <View style={styles.footer}>
            <Button
              title={submitting ? "Enregistrement..." : "Valider"}
              onPress={handleValidate}
              disabled={!canValidate || submitting}
              style={styles.validateButton}
            />
            <Pressable
              onPress={handleSkip}
              disabled={submitting}
              accessibilityRole="button"
            >
              <Text style={styles.skipText}>Plus tard</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function PitchView({
  isConnecting,
  onConnect,
  onManual,
  onLater,
}: {
  isConnecting: boolean;
  onConnect: () => void;
  onManual: () => void;
  onLater: () => void;
}) {
  return (
    <View style={styles.pitchContainer}>
      <View style={styles.pitchContent}>
        <MaterialIcons
          name="auto-awesome"
          size={64}
          color={Colors.primary.survol}
        />
        <Text style={styles.pitchTitle}>Tes artistes favoris</Text>
        <Text style={styles.pitchSubtitle}>
          Connecte Spotify pour récupérer tes vrais artistes favoris en un clic,
          ou choisis-les manuellement.
        </Text>
      </View>
      <View style={styles.pitchActions}>
        <TouchableOpacity
          style={[styles.spotifyButton, isConnecting && styles.disabledOpacity]}
          onPress={onConnect}
          disabled={isConnecting}
          accessibilityRole="button"
          accessibilityLabel="Connecter Spotify"
        >
          {isConnecting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FontAwesome name="spotify" size={20} color="#fff" />
              <Text style={styles.spotifyButtonText}>Connecter Spotify</Text>
            </>
          )}
        </TouchableOpacity>
        <Button
          title="Choisir manuellement"
          variant="outline"
          onPress={onManual}
          disabled={isConnecting}
          style={styles.validateButton}
        />
        <Pressable onPress={onLater} disabled={isConnecting}>
          <Text style={styles.skipText}>Plus tard</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SpotifyArtistsList({
  loading,
  pinnedArtists,
  suggestions,
  selectedIds,
  maxReached,
  onToggle,
}: {
  loading: boolean;
  pinnedArtists: OnboardingArtistSuggestion[];
  suggestions: OnboardingArtistSuggestion[];
  selectedIds: Set<number>;
  maxReached: boolean;
  onToggle: (artist: OnboardingArtistSuggestion) => void;
}) {
  const pinnedIds = useMemo(
    () => new Set(pinnedArtists.map((a) => a.id)),
    [pinnedArtists],
  );
  const filteredSuggestions = useMemo(
    () => suggestions.filter((a) => !pinnedIds.has(a.id)),
    [suggestions, pinnedIds],
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.survol} />
      </View>
    );
  }

  return (
    <FlatList
      data={filteredSuggestions}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <>
          {pinnedArtists.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>Tes artistes sélectionnés</Text>
              {pinnedArtists.map((artist) => (
                <ArtistRow
                  key={artist.id}
                  artist={artist}
                  isSelected={selectedIds.has(artist.id)}
                  maxReached={maxReached}
                  onToggle={onToggle}
                />
              ))}
            </View>
          )}
          {filteredSuggestions.length > 0 && (
            <Text style={styles.sectionTitle}>Top artistes Spotify</Text>
          )}
        </>
      }
      renderItem={({ item }) => (
        <ArtistRow
          artist={item}
          isSelected={selectedIds.has(item.id)}
          maxReached={maxReached}
          onToggle={onToggle}
        />
      )}
      ListEmptyComponent={
        pinnedArtists.length === 0 ? (
          <Text style={styles.empty}>Aucune suggestion Spotify disponible</Text>
        ) : null
      }
    />
  );
}

function ArtistRow({
  artist,
  isSelected,
  maxReached,
  onToggle,
}: {
  artist: OnboardingArtistSuggestion;
  isSelected: boolean;
  maxReached: boolean;
  onToggle: (artist: OnboardingArtistSuggestion) => void;
}) {
  const isDisabled = maxReached && !isSelected;
  return (
    <TouchableOpacity
      style={[styles.row, isSelected && styles.rowSelected]}
      onPress={() => onToggle(artist)}
      disabled={isDisabled}
    >
      <Image source={{ uri: artist.picture_medium }} style={styles.rowImage} />
      <Text style={styles.rowName} numberOfLines={1}>
        {artist.name}
      </Text>
      <MaterialIcons
        name={isSelected ? "check-circle" : "radio-button-unchecked"}
        size={24}
        color={isSelected ? Colors.primary.survol : Colors.game.textMuted}
      />
    </TouchableOpacity>
  );
}

function toSuggestion(artist: DeezerArtist): OnboardingArtistSuggestion {
  return {
    id: artist.id,
    name: artist.name,
    picture_medium: artist.picture_medium,
    picture_big: artist.picture_big,
  };
}

function suggestionToDeezerArtist(
  suggestion: OnboardingArtistSuggestion,
): DeezerArtist {
  return {
    id: suggestion.id,
    name: suggestion.name,
    link: "",
    picture: "",
    picture_small: "",
    picture_medium: suggestion.picture_medium,
    picture_big: suggestion.picture_big ?? "",
    picture_xl: "",
    nb_album: 0,
    nb_fan: suggestion.nb_fan ?? 0,
    type: "artist",
  };
}

async function enrichSelection(
  selection: { deezerArtistId: string; artistName: string }[],
): Promise<OnboardingArtistSuggestion[]> {
  return Promise.all(
    selection.map(async (artist) => {
      const id = Number(artist.deezerArtistId);
      try {
        const fetched = await deezerAPI.getArtist(id);
        return {
          id,
          name: fetched.name ?? artist.artistName,
          picture_medium: fetched.picture_medium,
          picture_big: fetched.picture_big,
        };
      } catch {
        return { id, name: artist.artistName, picture_medium: "" };
      }
    }),
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.dark.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.game.textMuted,
    marginBottom: 8,
  },
  counter: {
    fontSize: 13,
    color: Colors.primary.survol,
    fontWeight: "600",
  },
  manualContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
    marginTop: 10,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  rowSelected: {
    borderColor: Colors.primary.survol,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  rowImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  rowName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.dark.text,
  },
  empty: {
    textAlign: "center",
    color: Colors.game.textMuted,
    paddingVertical: 60,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
    alignItems: "center",
  },
  validateButton: {
    width: "100%",
  },
  skipText: {
    color: Colors.game.textMuted,
    fontSize: 14,
    paddingVertical: 8,
  },
  pitchContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    justifyContent: "space-between",
  },
  pitchContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  pitchTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.dark.text,
    textAlign: "center",
  },
  pitchSubtitle: {
    fontSize: 16,
    color: Colors.game.textMuted,
    textAlign: "center",
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  pitchActions: {
    gap: 12,
    alignItems: "center",
    width: "100%",
  },
  spotifyButton: {
    backgroundColor: SPOTIFY_GREEN,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 50,
    gap: 10,
  },
  spotifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  disabledOpacity: {
    opacity: 0.5,
  },
});
