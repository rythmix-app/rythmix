import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Colors } from "@/constants/Colors";
import { GameIcon } from "@/components/games/GameIcon";
import * as gameService from "@/services/gameService";
import { Game } from "@/types/games";
import { usePlayedGamesStore } from "@/stores/playedGamesStore";

function FavoriteGameCard({ game }: { game: Game }) {
  const scale = useSharedValue(1);
  const playedGameIds = usePlayedGamesStore((state) => state.playedGameIds);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 18, stiffness: 220 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 220 });
  };

  const handlePress = () => {
    const gameRoute = game.name.toLowerCase().replace(/\s+/g, "");
    if (playedGameIds.includes(game.id)) {
      router.push({
        pathname: `/games/${gameRoute}/game` as any,
        params: { gameId: game.id.toString() },
      });
    } else {
      router.push(`/games/${gameRoute}` as any);
    }
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        <LinearGradient
          colors={["#0d1f1f", "#0a1a2e"]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Glow border */}
        <View style={styles.cardBorder} />

        {/* Icon zone */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={["#1a3a3a", "#0d2233"]}
            style={StyleSheet.absoluteFillObject}
          />
          <GameIcon
            gameName={game.name}
            size={60}
            fallbackColor={Colors.primary.survol}
          />
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text numberOfLines={1} style={styles.cardTitle}>
            {game.name}
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={14}
            color={Colors.primary.survol}
          />
        </View>

        {/* Enabled badge */}
        {!game.isEnabled && (
          <View style={styles.disabledBadge}>
            <Text style={styles.disabledText}>Bientôt</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function FavoriteGamesSection() {
  const [favoriteGames, setFavoriteGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      gameService
        .getMyFavoriteGames()
        .then((games) => {
          setFavoriteGames(games.sort((a) => (a.isEnabled ? -1 : 1)));
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, []),
  );

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <MaterialIcons name="star" size={20} color={Colors.primary.survol} />
          <Text style={styles.sectionTitle}>Jeux favoris</Text>
        </View>
        <Pressable onPress={() => router.push("/(tabs)/games" as any)}>
          <Text style={styles.seeAll}>Voir tout</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.grid}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : favoriteGames.length === 0 ? (
        <Pressable
          style={styles.emptyState}
          onPress={() => router.push("/(tabs)/games" as any)}
        >
          <LinearGradient
            colors={["#0d1a1a", "#0a1520"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.emptyIconWrap}>
            <MaterialIcons
              name="star-border"
              size={28}
              color={Colors.primary.survol}
            />
          </View>
          <Text style={styles.emptyTitle}>Aucun favori</Text>
          <Text style={styles.emptySubtitle}>
            Ajoute des jeux depuis l&apos;onglet Jeux
          </Text>
          <View style={styles.emptyAction}>
            <Text style={styles.emptyActionText}>Explorer les jeux</Text>
            <MaterialIcons
              name="arrow-forward"
              size={14}
              color={Colors.primary.CTA}
            />
          </View>
        </Pressable>
      ) : (
        <View style={styles.grid}>
          {favoriteGames.map((game) => (
            <FavoriteGameCard key={game.id} game={game} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 32,
  },

  // Header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontFamily: "Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  seeAll: {
    color: Colors.primary.CTA,
    fontSize: 13,
    fontFamily: "Regular",
  },

  // Card
  card: {
    width: 140,
    height: 160,
    borderRadius: 18,
    overflow: "hidden",
    padding: 14,
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(20, 255, 236, 0.18)",
  },
  iconContainer: {
    width: 76,
    height: 76,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(20, 255, 236, 0.12)",
  },
  cardFooter: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Bold",
    flex: 1,
  },
  disabledBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(245, 165, 36, 0.2)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#F5A524",
  },
  disabledText: {
    color: "#F5A524",
    fontSize: 10,
    fontFamily: "Bold",
  },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },

  // Skeleton loader
  skeleton: {
    width: 140,
    height: 160,
    borderRadius: 18,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    opacity: 0.6,
  },

  // Empty state
  emptyState: {
    borderRadius: 18,
    overflow: "hidden",
    padding: 24,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(20, 255, 236, 0.12)",
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(20, 255, 236, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(20, 255, 236, 0.15)",
  },
  emptyTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontFamily: "Bold",
  },
  emptySubtitle: {
    color: "#555",
    fontSize: 12,
    fontFamily: "Regular",
    textAlign: "center",
  },
  emptyAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary.CTA,
  },
  emptyActionText: {
    color: Colors.primary.CTA,
    fontSize: 13,
    fontFamily: "Bold",
  },
});
