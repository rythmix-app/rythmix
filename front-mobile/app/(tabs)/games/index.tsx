import { Href, router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { GameCard } from "@/components/games/GameCard";
import type { GameCardProps } from "@/components/games/GameCard";

type GameItem = Omit<GameCardProps, "onPress" | "onToggleFavorite">;

const GAME_DATA: GameItem[] = [
  {
    id: "blindtest",
    title: "Blindtest",
    image:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=600&q=80",
    isFavorite: true,
    badge: "popular",
    playerMode: "both",
  },
  {
    id: "plus-ou-moins",
    title: "Plus ou Moins",
    image:
      "https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?auto=format&fit=crop&w=600&q=80",
    isFavorite: true,
    badge: "new",
    playerMode: "multi",
  },
  {
    id: "trackliste",
    title: "Trackliste",
    image:
      "https://images.unsplash.com/photo-1507878866276-a947ef722fee?auto=format&fit=crop&w=600&q=80",
    isFavorite: false,
    badge: "soon",
    playerMode: "solo",
  },
  {
    id: "rythmix-live",
    title: "Rythmix Live",
    image:
      "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?auto=format&fit=crop&w=600&q=80",
    isFavorite: false,
    playerMode: "multi",
  },
];

export default function GamesScreen() {
  const [favoriteState, setFavoriteState] = useState<Record<string, boolean>>(
    () =>
      GAME_DATA.reduce<Record<string, boolean>>((acc, game) => {
        acc[game.id] = Boolean(game.isFavorite);
        return acc;
      }, {}),
  );

  const sections = useMemo(
    () => [
      { key: "favorites", title: "Favoris", icon: "heart" as const },
      { key: "solo", title: "Jeux solo", icon: "person" as const },
      { key: "multi", title: "Jeux à plusieurs", icon: "people" as const },
    ],
    [],
  );

  const handleToggleFavorite = (id: string) => {
    setFavoriteState((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handlePressGame = (id: string) => {
    router.push(`/(tabs)/games/${id}` as Href);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {sections.map((section) => {
        const gamesForSection = GAME_DATA.filter((game) => {
          if (section.key === "favorites") {
            return favoriteState[game.id];
          }
          if (section.key === "solo") {
            return game.playerMode === "solo";
          }
          return game.playerMode !== "solo";
        });

        if (gamesForSection.length === 0) {
          return null;
        }

        return (
          <View key={section.key} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon} size={18} color="#FFFFFF" />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            <View style={styles.cardsRow}>
              {gamesForSection.map((game) => (
                <GameCard
                  key={game.id}
                  {...game}
                  isFavorite={favoriteState[game.id]}
                  onPress={() => handlePressGame(game.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 22,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Bold",
    textTransform: "uppercase",
  },
  cardsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
