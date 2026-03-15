import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Colors } from "@/constants/Colors";
import * as gameService from "@/services/gameService";
import { Game } from "@/types/games";
import { getGameIcon } from "@/utils/games";

function FavoriteGameCard({ game }: { game: Game }) {
  const scale = useSharedValue(1);
  const gameIcon = getGameIcon(game.name);

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
    router.push(`/games/${gameRoute}` as any);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        <View style={styles.iconContainer}>
          <MaterialIcons name={gameIcon.name} size={36} color="#D8E7E7" />
          <LinearGradient
            colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.45)"]}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
        <Text numberOfLines={2} style={styles.cardTitle}>
          {game.name}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function FavoriteGamesSection() {
  const [favoriteGames, setFavoriteGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gameService
      .getMyFavoriteGames()
      .then((games) => {
        setFavoriteGames(games.sort((a) => (a.isEnabled ? -1 : 1)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialIcons name="star" size={22} color={Colors.primary.survol} />
        <Text style={styles.sectionTitle}>Jeux favoris</Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="small"
          color={Colors.primary.survol}
          style={styles.loader}
        />
      ) : favoriteGames.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons
            name="star-border"
            size={32}
            color={Colors.primary.CTA}
          />
          <Text style={styles.emptyTitle}>Aucun jeu favori</Text>
          <Text style={styles.emptySubtitle}>
            Marque tes jeux préférés depuis l&apos;onglet Jeux pour les
            retrouver ici.
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {favoriteGames.map((game) => (
            <FavoriteGameCard key={game.id} game={game} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontFamily: "Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  loader: {
    marginTop: 12,
  },
  carousel: {
    gap: 12,
    paddingRight: 4,
  },
  card: {
    width: 120,
    height: 140,
    borderRadius: 16,
    backgroundColor: "#121212",
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#14FFEC",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#161c27",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Bold",
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: "#121212",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e1e1e",
  },
  emptyTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontFamily: "Bold",
  },
  emptySubtitle: {
    color: "#666",
    fontSize: 13,
    fontFamily: "Regular",
    textAlign: "center",
    lineHeight: 18,
  },
});
