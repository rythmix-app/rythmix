import { useEffect, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";
import { getAllGames } from "@/services/gameService";

export default function TracklistIndexScreen() {
  const [gameId, setGameId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadGameId();
  }, []);

  const loadGameId = async () => {
    try {
      const games = await getAllGames();
      const tracklist = games.find((g) => g.name.toLowerCase() === "tracklist");
      if (tracklist) {
        setGameId(tracklist.id);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Failed to load game ID:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = () => {
    if (gameId) {
      router.push({
        pathname: "/games/tracklist/game",
        params: { gameId: gameId.toString() },
      });
    }
  };

  // Show loading state
  if (loading) {
    return (
      <>
        <Header title="Tracklist" variant="withBack" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.survol} />
          <ThemedText style={styles.loadingText}>Chargement...</ThemedText>
        </View>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <Header title="Tracklist" variant="withBack" />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={80} color="#ff6b6b" />
          <ThemedText type="title" style={styles.errorTitle}>
            Jeu indisponible
          </ThemedText>
          <ThemedText style={styles.errorText}>
            Impossible de charger le jeu. Veuillez réessayer plus tard.
          </ThemedText>
          <Button
            title="Retour"
            onPress={() => router.back()}
            style={styles.errorButton}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Header title="Tracklist" variant="withBack" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <MaterialIcons
            name="queue-music"
            size={80}
            color={Colors.primary.survol}
          />
          <ThemedText type="title" style={styles.title}>
            Tracklist
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Listez tous les titres d&apos;un album !
          </ThemedText>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="info"
              size={24}
              color={Colors.primary.survol}
            />
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Objectif
            </ThemedText>
          </View>
          <ThemedText style={styles.text}>
            Listez tous les titres d&apos;un album, mixtape ou EP dans
            n&apos;importe quel ordre. Plus vous trouvez de titres, plus vous
            gagnez de points !
          </ThemedText>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="sports-esports"
              size={24}
              color={Colors.primary.survol}
            />
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Comment jouer
            </ThemedText>
          </View>
          <View style={styles.list}>
            <View style={styles.listItem}>
              <ThemedText style={styles.listNumber}>1.</ThemedText>
              <ThemedText style={styles.listText}>
                Cliquez sur &quot;Commencer à jouer&quot;
              </ThemedText>
            </View>
            <View style={styles.listItem}>
              <ThemedText style={styles.listNumber}>2.</ThemedText>
              <ThemedText style={styles.listText}>
                Choisissez un genre musical
              </ThemedText>
            </View>
            <View style={styles.listItem}>
              <ThemedText style={styles.listNumber}>3.</ThemedText>
              <ThemedText style={styles.listText}>
                Un album s&apos;affiche avec sa pochette et son nom
              </ThemedText>
            </View>
            <View style={styles.listItem}>
              <ThemedText style={styles.listNumber}>4.</ThemedText>
              <ThemedText style={styles.listText}>
                Listez tous les titres dans les champs de texte
              </ThemedText>
            </View>
            <View style={styles.listItem}>
              <ThemedText style={styles.listNumber}>5.</ThemedText>
              <ThemedText style={styles.listText}>
                Vous avez 5 minutes pour compléter la liste
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="rule"
              size={24}
              color={Colors.primary.survol}
            />
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Règles
            </ThemedText>
          </View>
          <View style={styles.ruleCard}>
            <MaterialIcons
              name="timer"
              size={20}
              color={Colors.primary.survol}
            />
            <ThemedText style={styles.ruleText}>
              <ThemedText style={styles.ruleBold}>
                5 minutes pour lister les titres
              </ThemedText>
              {"\n"}Timer visible à l&apos;écran
            </ThemedText>
          </View>
          <View style={styles.ruleCard}>
            <MaterialIcons
              name="shuffle"
              size={20}
              color={Colors.primary.survol}
            />
            <ThemedText style={styles.ruleText}>
              <ThemedText style={styles.ruleBold}>
                N&apos;importe quel ordre
              </ThemedText>
              {"\n"}Pas besoin de respecter l&apos;ordre de l&apos;album
            </ThemedText>
          </View>
          <View style={styles.ruleCard}>
            <MaterialIcons
              name="check-circle"
              size={20}
              color={Colors.primary.survol}
            />
            <ThemedText style={styles.ruleText}>
              <ThemedText style={styles.ruleBold}>
                1 point par titre correct
              </ThemedText>
              {"\n"}Chaque titre trouvé = 1 point
            </ThemedText>
          </View>
          <View style={styles.ruleCard}>
            <MaterialIcons
              name="text-fields"
              size={20}
              color={Colors.primary.survol}
            />
            <ThemedText style={styles.ruleText}>
              <ThemedText style={styles.ruleBold}>
                Approximation acceptée
              </ThemedText>
              {"\n"}Majuscules, accents et ponctuation non pris en compte
            </ThemedText>
          </View>
          <View style={styles.ruleCard}>
            <MaterialIcons
              name="block"
              size={20}
              color={Colors.primary.survol}
            />
            <ThemedText style={styles.ruleText}>
              <ThemedText style={styles.ruleBold}>Pas de doublons</ThemedText>
              {"\n"}Un titre répété = 0 point
            </ThemedText>
          </View>
          <View style={styles.ruleCard}>
            <MaterialIcons
              name="flag"
              size={20}
              color={Colors.primary.survol}
            />
            <ThemedText style={styles.ruleText}>
              <ThemedText style={styles.ruleBold}>
                Possibilité d&apos;abandonner
              </ThemedText>
              {"\n"}Bouton d&apos;abandon disponible
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="bar-chart"
              size={24}
              color={Colors.primary.survol}
            />
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Points
            </ThemedText>
          </View>
          <View style={styles.pointCard}>
            <View style={styles.pointRow}>
              <ThemedText style={styles.pointLabel}>Titre trouvé</ThemedText>
              <ThemedText style={styles.pointValue}>+1 point</ThemedText>
            </View>
          </View>
          <View style={styles.pointCard}>
            <View style={styles.pointRow}>
              <ThemedText style={styles.pointLabel}>
                Titre répété, inexistant ou vide
              </ThemedText>
              <ThemedText style={styles.pointValue}>0 point</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.scoreInfo}>
            Score final = nombre de titres corrects / nombre total de titres
          </ThemedText>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Commencer à jouer"
            onPress={handleStartGame}
            style={styles.playButton}
          />
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
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    color: "#999",
    textAlign: "center",
    fontSize: 16,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    color: "white",
    fontSize: 20,
  },
  text: {
    color: "#CCC",
    fontSize: 16,
    lineHeight: 24,
  },
  list: {
    gap: 12,
  },
  listItem: {
    flexDirection: "row",
    gap: 12,
  },
  listNumber: {
    color: Colors.primary.survol,
    fontSize: 16,
    fontWeight: "bold",
    minWidth: 20,
  },
  listText: {
    color: "#CCC",
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  ruleCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary.survol,
  },
  ruleText: {
    color: "#CCC",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  ruleBold: {
    color: "white",
    fontWeight: "bold",
    fontSize: 15,
  },
  pointCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary.survol,
  },
  pointRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pointLabel: {
    color: "white",
    fontSize: 16,
    flex: 1,
  },
  pointValue: {
    color: Colors.primary.survol,
    fontSize: 18,
    fontWeight: "bold",
  },
  scoreInfo: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },
  buttonContainer: {
    marginTop: 20,
  },
  playButton: {
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    marginTop: 15,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorTitle: {
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
    color: "#ff6b6b",
  },
  errorText: {
    color: "#999",
    textAlign: "center",
    fontSize: 16,
    marginBottom: 30,
  },
  errorButton: {
    paddingHorizontal: 40,
  },
});
