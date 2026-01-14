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
      Alert.alert(
        game.name,
        "Ce jeu n'est pas encore disponible.",
        [{ text: "OK" }]
      );
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
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons
            name="person"
            size={32}
            color={Colors.primary.survol}
          />
          <Text style={styles.sectionTitle}>
            Jeux Solo
          </Text>
        </View>
        <View style={styles.list}>
          {soloGames.map((game) => (
            <TouchableOpacity
              key={game.id}
              style={[
                styles.gameItem,
                !game.isEnabled && styles.gameItemDisabled
              ]}
              onPress={() => handleGamePress(game)}
            >
              <ThemedText style={[
                styles.gameName,
                !game.isEnabled && styles.gameNameDisabled
              ]}>
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
                !game.isEnabled && styles.gameItemDisabled
              ]}
              onPress={() => handleGamePress(game)}
            >
              <ThemedText style={[
                styles.gameName,
                !game.isEnabled && styles.gameNameDisabled
              ]}>
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
    fontFamily: "Bold"
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
