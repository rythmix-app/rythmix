import { useEffect, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";
import { getAllGames } from "@/services/gameService";
import { Game } from "@/types/games";

export default function BlurchetteIndexScreen() {
  const [gameId, setGameId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadGameId();
  }, []);

  const loadGameId = async () => {
    try {
      const games = await getAllGames();
      const blurchette = games.find(
        (g) => g.name.toLowerCase() === "blurchette"
      );
      if (blurchette) {
        setGameId(blurchette.id);
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
        pathname: "/games/blurchette/game",
        params: { gameId: gameId.toString() },
      });
    }
  };

  // Show loading state
  if (loading) {
    return (
      <>
        <Header title="Blurchette" variant="withBack" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.survol} />
          <ThemedText style={styles.loadingText}>
            Chargement...
          </ThemedText>
        </View>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <Header title="Blurchette" variant="withBack" />
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
      <Header title="Blurchette" variant="withBack" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <MaterialIcons name="blur-on" size={80} color={Colors.primary.survol} />
        <ThemedText type="title" style={styles.title}>
          Blurchette
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Devinez les pochettes d&#39;albums floues !
        </ThemedText>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="info" size={24} color={Colors.primary.survol} />
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Objectif
          </ThemedText>
        </View>
        <ThemedText style={styles.text}>
          Devinez quelle pochette d&#39;album est affichée alors qu&#39;elle est floue.
          Plus vous trouvez tôt (avec un flou élevé), plus vous gagnez de points !
        </ThemedText>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="sports-esports" size={24} color={Colors.primary.survol} />
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Comment jouer
          </ThemedText>
        </View>
        <View style={styles.list}>
          <View style={styles.listItem}>
            <ThemedText style={styles.listNumber}>1.</ThemedText>
            <ThemedText style={styles.listText}>
              Un joueur crée une partie et devient maître du jeu
            </ThemedText>
          </View>
          <View style={styles.listItem}>
            <ThemedText style={styles.listNumber}>2.</ThemedText>
            <ThemedText style={styles.listText}>
              Les autres joueurs rejoignent via un code ou QR code
            </ThemedText>
          </View>
          <View style={styles.listItem}>
            <ThemedText style={styles.listNumber}>3.</ThemedText>
            <ThemedText style={styles.listText}>
              Une pochette d&#39;album très floue apparaît
            </ThemedText>
          </View>
          <View style={styles.listItem}>
            <ThemedText style={styles.listNumber}>4.</ThemedText>
            <ThemedText style={styles.listText}>
              Le flou diminue progressivement en 5 niveaux
            </ThemedText>
          </View>
          <View style={styles.listItem}>
            <ThemedText style={styles.listNumber}>5.</ThemedText>
            <ThemedText style={styles.listText}>
              Devinez l&#39;album et l&#39;artiste le plus tôt possible
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="rule" size={24} color={Colors.primary.survol} />
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Règles
          </ThemedText>
        </View>
        <View style={styles.ruleCard}>
          <MaterialIcons name="blur-circular" size={20} color={Colors.primary.survol} />
          <ThemedText style={styles.ruleText}>
            <ThemedText style={styles.ruleBold}>5 niveaux de flou</ThemedText>
            {"\n"}Du plus flou (niveau 1) au plus net (niveau 5)
          </ThemedText>
        </View>
        <View style={styles.ruleCard}>
          <MaterialIcons name="emoji-events" size={20} color={Colors.primary.survol} />
          <ThemedText style={styles.ruleText}>
            <ThemedText style={styles.ruleBold}>Plus de points en début</ThemedText>
            {"\n"}Trouvez au niveau 1 = maximum de points
          </ThemedText>
        </View>
        <View style={styles.ruleCard}>
          <MaterialIcons name="timer" size={20} color={Colors.primary.survol} />
          <ThemedText style={styles.ruleText}>
            <ThemedText style={styles.ruleBold}>Temps limité</ThemedText>
            {"\n"}Chaque niveau a un temps de réponse limité
          </ThemedText>
        </View>
        <View style={styles.ruleCard}>
          <MaterialIcons name="check-circle" size={20} color={Colors.primary.survol} />
          <ThemedText style={styles.ruleText}>
            <ThemedText style={styles.ruleBold}>Une réponse par niveau</ThemedText>
            {"\n"}Réfléchissez bien avant de soumettre !
          </ThemedText>
        </View>
        <View style={styles.ruleCard}>
          <MaterialIcons name="speed" size={20} color={Colors.primary.survol} />
          <ThemedText style={styles.ruleText}>
            <ThemedText style={styles.ruleBold}>Départage par rapidité</ThemedText>
            {"\n"}En cas d&#39;égalité, le plus rapide gagne
          </ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="bar-chart" size={24} color={Colors.primary.survol} />
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Points
          </ThemedText>
        </View>
        <View style={styles.pointsGrid}>
          <View style={styles.pointCard}>
            <ThemedText style={styles.pointLevel}>Niveau 1</ThemedText>
            <ThemedText style={styles.pointValue}>500 pts</ThemedText>
            <ThemedText style={styles.pointLabel}>Très flou</ThemedText>
          </View>
          <View style={styles.pointCard}>
            <ThemedText style={styles.pointLevel}>Niveau 2</ThemedText>
            <ThemedText style={styles.pointValue}>400 pts</ThemedText>
            <ThemedText style={styles.pointLabel}>Flou</ThemedText>
          </View>
          <View style={styles.pointCard}>
            <ThemedText style={styles.pointLevel}>Niveau 3</ThemedText>
            <ThemedText style={styles.pointValue}>300 pts</ThemedText>
            <ThemedText style={styles.pointLabel}>Moyen</ThemedText>
          </View>
          <View style={styles.pointCard}>
            <ThemedText style={styles.pointLevel}>Niveau 4</ThemedText>
            <ThemedText style={styles.pointValue}>200 pts</ThemedText>
            <ThemedText style={styles.pointLabel}>Léger</ThemedText>
          </View>
          <View style={styles.pointCard}>
            <ThemedText style={styles.pointLevel}>Niveau 5</ThemedText>
            <ThemedText style={styles.pointValue}>100 pts</ThemedText>
            <ThemedText style={styles.pointLabel}>Net</ThemedText>
          </View>
        </View>
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
  pointsGrid: {
    gap: 10,
  },
  pointCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary.survol,
  },
  pointLevel: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  pointValue: {
    color: Colors.primary.survol,
    fontSize: 20,
    fontWeight: "bold",
    marginRight: 15,
  },
  pointLabel: {
    color: "#999",
    fontSize: 14,
    width: 80,
    textAlign: "right",
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
