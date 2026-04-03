import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";
import { Game } from "@/types/games";
import * as gameService from "@/services/gameService";
import { GameCard } from "@/components/games/GameCard";
import { useToast } from "@/components/Toast";
import { hasGameState } from "@/services/gameStorageService";

export default function GamesScreen() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedGames, setSavedGames] = useState<Record<string, boolean>>({});
  const { show } = useToast();

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const g = await gameService.getAllGames();
        setGames(g);
      } catch (error) {
        console.error("Failed to fetch games:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const checkSavedGames = async () => {
        const status: Record<string, boolean> = {};
        for (const game of games) {
          status[game.id] = await hasGameState(game.id.toString());
        }
        setSavedGames(status);
      };

      if (games.length > 0) {
        checkSavedGames();
      }
    }, [games]),
  );

  const handleGamePress = (game: Game) => {
    if (game.isEnabled) {
      const gameRoute = game.name.toLowerCase().replace(/\s+/g, "");
      router.push(`/games/${gameRoute}` as any);
    } else {
      show({
        type: "warning",
        message: `${game.name} n'est pas encore disponible.`,
      });
    }
  };

  const handleToggleFavorite = async (game: Game) => {
    try {
      setGames((prevGames) =>
        prevGames.map((g) =>
          g.id === game.id ? { ...g, isFavorite: !g.isFavorite } : g,
        ),
      );

      if (game.isFavorite) {
        await gameService.removeFavoriteGame(game.id);
      } else {
        await gameService.addFavoriteGame(game.id);
      }
    } catch (error) {
      setGames((prevGames) =>
        prevGames.map((g) =>
          g.id === game.id ? { ...g, isFavorite: !g.isFavorite } : g,
        ),
      );
      show({
        type: "error",
        message: "Impossible de modifier les favoris. Veuillez réessayer.",
      });
      console.error("Failed to toggle favorite:", error);
    }
  };

  const favoriteGames = games
    .filter((game) => game.isFavorite)
    .sort((a, b) => (a.isEnabled ? -1 : 1));
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
        {favoriteGames.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons
                name="star"
                size={32}
                color={Colors.primary.survol}
              />
              <Text style={styles.sectionTitle}>Mes Favoris</Text>
            </View>
            <View style={styles.cardGrid}>
              {favoriteGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onPress={handleGamePress}
                  onToggleFavorite={handleToggleFavorite}
                  hasSavedGame={savedGames[game.id]}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="person"
              size={32}
              color={Colors.primary.survol}
            />
            <Text style={styles.sectionTitle}>Jeux Solo</Text>
          </View>
          <View style={styles.cardGrid}>
            {soloGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onPress={handleGamePress}
                onToggleFavorite={handleToggleFavorite}
                hasSavedGame={savedGames[game.id]}
              />
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
          <View style={styles.cardGrid}>
            {multiplayerGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onPress={handleGamePress}
                onToggleFavorite={handleToggleFavorite}
                hasSavedGame={savedGames[game.id]}
              />
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
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
    columnGap: 12,
  },
  emptyText: {
    color: "#666",
    fontStyle: "italic",
    fontSize: 14,
  },
});
