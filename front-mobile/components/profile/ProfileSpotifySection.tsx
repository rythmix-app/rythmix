import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useToast } from "@/components/Toast";
import { useSpotifyIntegration } from "@/hooks/useSpotifyIntegration";
import { useSpotifyStats } from "@/hooks/useSpotifyStats";
import { SpotifyArtist, SpotifyTrack } from "@/types/spotify";

const SPOTIFY_GREEN = "#1DB954";
const ITEM_LIMIT = 5;

export default function ProfileSpotifySection() {
  const { status, isLoading, isConnecting, connect, refresh } =
    useSpotifyIntegration();
  const { show } = useToast();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (isLoading) {
    return (
      <View style={styles.section}>
        <View style={styles.skeletonCard} />
      </View>
    );
  }

  const connected = status?.connected === true;

  if (!connected) {
    const handlePress = async () => {
      const result = await connect();
      if (result === "ok") {
        show({ type: "success", message: "Spotify connecté" });
      } else if (result === "error") {
        show({ type: "error", message: "La connexion Spotify a échoué" });
      }
    };

    return (
      <View style={styles.section}>
        <Pressable
          style={styles.ctaCard}
          onPress={handlePress}
          disabled={isConnecting}
          accessibilityRole="button"
          accessibilityLabel="Lier mon compte Spotify"
        >
          <View style={styles.ctaIconBadge}>
            <FontAwesome name="spotify" size={22} color="#0A0A0A" />
          </View>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>Voir mes stats Spotify</Text>
            <Text style={styles.ctaSubtitle}>
              {isConnecting
                ? "Connexion en cours…"
                : "Liez votre compte pour découvrir vos top tracks et artistes"}
            </Text>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Mes stats Spotify</Text>
      <SpotifyTopTracksBlock />
      <SpotifyTopArtistsBlock />
      <SpotifyRecentlyPlayedBlock />
    </View>
  );
}

function SpotifyTopTracksBlock() {
  const { tracks, isLoading, error } = useSpotifyStats({
    type: "topTracks",
    timeRange: "medium_term",
    limit: ITEM_LIMIT,
  });

  return (
    <SpotifyBlock title="Top titres" isLoading={isLoading} error={error}>
      <HorizontalList
        items={tracks}
        keyExtractor={(item) => item.id}
        emptyLabel="Aucun titre à afficher"
        renderItem={(item) => <SpotifyTrackCard track={item} />}
      />
    </SpotifyBlock>
  );
}

function SpotifyTopArtistsBlock() {
  const { artists, isLoading, error } = useSpotifyStats({
    type: "topArtists",
    timeRange: "medium_term",
    limit: ITEM_LIMIT,
  });

  return (
    <SpotifyBlock title="Top artistes" isLoading={isLoading} error={error}>
      <HorizontalList
        items={artists}
        keyExtractor={(item) => item.id}
        emptyLabel="Aucun artiste à afficher"
        renderItem={(item) => <SpotifyArtistCard artist={item} />}
      />
    </SpotifyBlock>
  );
}

function SpotifyRecentlyPlayedBlock() {
  const { recentlyPlayed, isLoading, error } = useSpotifyStats({
    type: "recentlyPlayed",
    limit: ITEM_LIMIT,
  });

  return (
    <SpotifyBlock title="Récemment écouté" isLoading={isLoading} error={error}>
      <HorizontalList
        items={recentlyPlayed}
        keyExtractor={(item, idx) =>
          `${item.track.id}-${item.played_at}-${idx}`
        }
        emptyLabel="Aucune écoute récente"
        renderItem={(item) => <SpotifyTrackCard track={item.track} />}
      />
    </SpotifyBlock>
  );
}

function SpotifyBlock({
  title,
  isLoading,
  error,
  children,
}: {
  title: string;
  isLoading: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      {isLoading ? (
        <View style={styles.blockLoader}>
          <ActivityIndicator color={Colors.primary.survol} />
        </View>
      ) : error ? (
        <Text style={styles.blockMuted}>Données indisponibles</Text>
      ) : (
        children
      )}
    </View>
  );
}

interface HorizontalListProps<T> {
  items: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyLabel: string;
}

function HorizontalList<T>({
  items,
  keyExtractor,
  renderItem,
  emptyLabel,
}: HorizontalListProps<T>) {
  if (items.length === 0) {
    return <Text style={styles.blockMuted}>{emptyLabel}</Text>;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalListContent}
    >
      {items.map((item, idx) => (
        <View
          key={keyExtractor(item, idx)}
          style={idx > 0 ? styles.itemSpacing : undefined}
        >
          {renderItem(item, idx)}
        </View>
      ))}
    </ScrollView>
  );
}

function SpotifyTrackCard({ track }: { track: SpotifyTrack }) {
  const cover = track.album?.images?.[0]?.url;
  return (
    <View style={styles.card}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverFallback]}>
          <Text style={styles.coverFallbackIcon}>🎵</Text>
        </View>
      )}
      <Text style={styles.cardTitle} numberOfLines={1}>
        {track.name}
      </Text>
      <Text style={styles.cardSubtitle} numberOfLines={1}>
        {track.artists.map((a) => a.name).join(", ")}
      </Text>
    </View>
  );
}

function SpotifyArtistCard({ artist }: { artist: SpotifyArtist }) {
  const cover = artist.images?.[0]?.url;
  return (
    <View style={styles.card}>
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={[styles.cover, styles.coverRound]}
        />
      ) : (
        <View style={[styles.cover, styles.coverRound, styles.coverFallback]}>
          <Text style={styles.coverFallbackIcon}>🎤</Text>
        </View>
      )}
      <Text style={styles.cardTitle} numberOfLines={1}>
        {artist.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary.CTA,
    paddingLeft: 10,
  },

  ctaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: SPOTIFY_GREEN,
  },
  ctaIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SPOTIFY_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaContent: {
    flex: 1,
  },
  ctaTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  ctaSubtitle: {
    color: Colors.dark.icon,
    fontSize: 12,
  },

  skeletonCard: {
    height: 72,
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },

  block: {
    marginBottom: 18,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.text,
    marginBottom: 8,
  },
  blockLoader: {
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  blockMuted: {
    color: Colors.dark.icon,
    fontSize: 12,
    paddingVertical: 12,
  },

  horizontalListContent: {
    paddingRight: 16,
  },
  itemSpacing: {
    marginLeft: 12,
  },
  card: {
    width: 110,
  },
  cover: {
    width: 110,
    height: 110,
    borderRadius: 8,
    backgroundColor: "#222",
    marginBottom: 6,
  },
  coverRound: {
    borderRadius: 55,
  },
  coverFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  coverFallbackIcon: {
    fontSize: 32,
  },
  cardTitle: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "600",
  },
  cardSubtitle: {
    color: Colors.dark.icon,
    fontSize: 11,
    marginTop: 2,
  },
});
