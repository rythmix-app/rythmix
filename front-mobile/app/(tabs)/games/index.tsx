import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";
import { Game } from "@/types/games";
import * as gameService from "@/services/gameService";
import { GameCard } from "@/components/games/GameCard";

export default function GamesScreen() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const g = await gameService.getAllGames();
        setGames(g);
        console.log(g);
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

  const handleToggleFavorite = async (game: Game) => {
    try {
      // Optimistic update
      setGames((prevGames) =>
        prevGames.map((g) =>
          g.id === game.id ? { ...g, isFavorite: !g.isFavorite } : g,
        ),
      );

      // API call
      if (game.isFavorite) {
        await gameService.removeFavoriteGame(game.id);
      } else {
        await gameService.addFavoriteGame(game.id);
      }
    } catch (error) {
      // Revert on error
      setGames((prevGames) =>
        prevGames.map((g) =>
          g.id === game.id ? { ...g, isFavorite: !g.isFavorite } : g,
        ),
      );
      Alert.alert(
        "Erreur",
        "Impossible de modifier les favoris. Veuillez réessayer.",
        [{ text: "OK" }],
      );
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
