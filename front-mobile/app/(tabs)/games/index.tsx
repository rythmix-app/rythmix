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
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";
import { Game } from "@/types/games";
import * as gameService from "@/services/gameService";

export default function GamesScreen() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const games = await gameService.getAllGames();
        setGames(games);
      } catch (error) {
        console.error("Failed to fetch games:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  const handleGamePress = (game: Game) => {
    if (game.isEnabled) {
      const gameRoute = game.name.toLowerCase().replace(/\s+/g, "");
      router.push(`/games/${gameRoute}` as any);
    } else {
      Alert.alert(game.name, "Ce jeu n'est pas encore disponible.", [
        { text: "OK" },
      ]);
    }
  };

  const soloGames = games
    .filter((game) => !game.isMultiplayer)
    .sort((a, b) => (a.isEnabled ? -1 : 1));
  const multiplayerGames = games
    .filter((game) => game.isMultiplayer)
    .sort((a, b) => (a.isEnabled ? -1 : 1));

  if (loading) {
    return (
      <>
        <Header title="Jeux" variant="withMenu" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.survol} />
        </View>
      </>
    );
  }

  return (
    <>
      <Header title="Jeux" variant="withMenu" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="person"
              size={32}
              color={Colors.primary.survol}
            />
            <Text style={styles.sectionTitle}>Jeux Solo</Text>
          </View>
          <View style={styles.list}>
            {soloGames.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={[
                  styles.gameItem,
                  !game.isEnabled && styles.gameItemDisabled,
                ]}
                onPress={() => handleGamePress(game)}
              >
                <ThemedText
                  style={[
                    styles.gameName,
                    !game.isEnabled && styles.gameNameDisabled,
                  ]}
                >
                  {game.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
            {soloGames.length === 0 && (
              <ThemedText style={styles.emptyText}>
                Aucun jeu solo disponible
              </ThemedText>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="groups"
              size={32}
              color={Colors.primary.survol}
            />
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Jeux à Plusieurs
            </ThemedText>
          </View>
          <View style={styles.list}>
            {multiplayerGames.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={[
                  styles.gameItem,
                  !game.isEnabled && styles.gameItemDisabled,
                ]}
                onPress={() => handleGamePress(game)}
              >
                <ThemedText
                  style={[
                    styles.gameName,
                    !game.isEnabled && styles.gameNameDisabled,
                  ]}
                >
                  {game.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
            {multiplayerGames.length === 0 && (
              <ThemedText style={styles.emptyText}>
                Aucun jeu multijoueur disponible
              </ThemedText>
            )}
          </View>
        </View>
      </ScrollView>
    </>
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
    backgroundColor: Colors.primary.fondPremier,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
    justifyContent: "center",
    alignItems: "center",
  },
  screenTitle: {
    color: "white",
    marginBottom: 30,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    color: "white",
    textTransform: "uppercase",
    fontSize: 32,
    fontFamily: "Bold",
  },
  list: {
    gap: 10,
  },
  gameItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary.survol,
  },
  gameName: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  emptyText: {
    color: "#666",
    fontStyle: "italic",
    fontSize: 14,
  },
  gameItemDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderLeftColor: "#666",
    opacity: 0.5,
  },
  gameNameDisabled: {
    color: "#999",
  },
});
