import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";
import { useSpotifyStats, SpotifyStatsType } from "@/hooks/useSpotifyStats";
import {
  SpotifyArtist,
  SpotifyRecentlyPlayedItem,
  SpotifyTrack,
} from "@/types/spotify";

const TABS: { key: SpotifyStatsType; label: string }[] = [
  { key: "topTracks", label: "Top titres" },
  { key: "topArtists", label: "Top artistes" },
  { key: "recentlyPlayed", label: "Récents" },
];

export default function SpotifyStatsScreen() {
  const [active, setActive] = useState<SpotifyStatsType>("topTracks");
  const { tracks, artists, recentlyPlayed, isLoading, error } = useSpotifyStats(
    { type: active },
  );

  return (
    <View style={styles.container}>
      <Header title="Mes stats Spotify" variant="withBack" />

      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, active === tab.key && styles.tabActive]}
            onPress={() => setActive(tab.key)}
          >
            <Text
              style={[
                styles.tabLabel,
                active === tab.key && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.primary.survol} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : active === "topTracks" ? (
          <TrackList tracks={tracks} />
        ) : active === "topArtists" ? (
          <ArtistList artists={artists} />
        ) : (
          <RecentlyPlayedList items={recentlyPlayed} />
        )}
      </View>
    </View>
  );
}

function TrackList({ tracks }: { tracks: SpotifyTrack[] }) {
  if (tracks.length === 0) return <EmptyState label="Aucun titre à afficher" />;
  return (
    <FlatList
      data={tracks}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <View style={styles.row}>
          <Text style={styles.rank}>{index + 1}</Text>
          {item.album?.images?.[0]?.url ? (
            <Image
              source={{ uri: item.album.images[0].url }}
              style={styles.cover}
            />
          ) : (
            <View style={[styles.cover, styles.coverFallback]}>
              <Text>🎵</Text>
            </View>
          )}
          <View style={styles.rowText}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.rowSubtitle} numberOfLines={1}>
              {item.artists.map((a) => a.name).join(", ")}
            </Text>
          </View>
        </View>
      )}
      contentContainerStyle={styles.listContent}
    />
  );
}

function ArtistList({ artists }: { artists: SpotifyArtist[] }) {
  if (artists.length === 0)
    return <EmptyState label="Aucun artiste à afficher" />;
  return (
    <FlatList
      data={artists}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <View style={styles.row}>
          <Text style={styles.rank}>{index + 1}</Text>
          {item.images?.[0]?.url ? (
            <Image source={{ uri: item.images[0].url }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverFallback]}>
              <Text>🎤</Text>
            </View>
          )}
          <View style={styles.rowText}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.rowSubtitle} numberOfLines={1}>
              {item.genres?.slice(0, 2).join(", ") ?? ""}
            </Text>
          </View>
        </View>
      )}
      contentContainerStyle={styles.listContent}
    />
  );
}

function RecentlyPlayedList({ items }: { items: SpotifyRecentlyPlayedItem[] }) {
  if (items.length === 0) return <EmptyState label="Aucune écoute récente" />;
  return (
    <FlatList
      data={items}
      keyExtractor={(item, idx) => `${item.track.id}-${item.played_at}-${idx}`}
      renderItem={({ item }) => (
        <View style={styles.row}>
          {item.track.album?.images?.[0]?.url ? (
            <Image
              source={{ uri: item.track.album.images[0].url }}
              style={styles.cover}
            />
          ) : (
            <View style={[styles.cover, styles.coverFallback]}>
              <Text>🎵</Text>
            </View>
          )}
          <View style={styles.rowText}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.track.name}
            </Text>
            <Text style={styles.rowSubtitle} numberOfLines={1}>
              {item.track.artists.map((a) => a.name).join(", ")}
            </Text>
          </View>
        </View>
      )}
      contentContainerStyle={styles.listContent}
    />
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
  },
  tabs: {
    marginTop: 12,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  tabActive: {
    backgroundColor: Colors.primary.CTADark,
    borderColor: Colors.primary.survol,
  },
  tabLabel: {
    color: Colors.dark.icon,
    fontSize: 13,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: Colors.primary.survol,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 10,
  },
  rank: {
    width: 22,
    textAlign: "center",
    color: Colors.primary.survol,
    fontWeight: "700",
    fontSize: 14,
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#222",
  },
  coverFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: "600",
  },
  rowSubtitle: {
    color: Colors.dark.icon,
    fontSize: 12,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: Colors.game.error,
    fontSize: 14,
  },
  emptyText: {
    color: Colors.dark.icon,
    fontSize: 14,
  },
});
