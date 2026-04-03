import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import Header from "@/components/Header";
import ConfirmationModal from "@/components/ConfirmationModal";
import { Colors } from "@/constants/Colors";
import { getAllGames } from "@/services/gameService";
import { hasGameState } from "@/services/gameStorageService";
import {
  getMyActiveSession,
  updateGameSession,
} from "@/services/gameSessionService";
import { GameSession } from "@/types/gameSession";
import * as Haptics from "expo-haptics";

export default function BlurchetteIndexScreen() {
  const [gameId, setGameId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [isResumeModalVisible, setIsResumeModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadGameId();
    }, []),
  );

  const loadGameId = async () => {
    try {
      const games = await getAllGames();
      const blurchette = games.find(
        (g) => g.name.toLowerCase() === "blurchette",
      );
      if (blurchette) {
        setGameId(blurchette.id);
        const savedStateExists = await hasGameState(blurchette.id.toString());
        setHasSavedGame(savedStateExists);
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

  const handleStartGame = async (resume: boolean = false) => {
    if (!gameId) return;

    if (resume) {
      Haptics.selectionAsync().catch(() => {});
      navigateToGame(true);
      return;
    }

    setLoading(true);
    try {
      const session = await getMyActiveSession(gameId);

      if (session && session.status === "active") {
        setActiveSession(session);
        setIsResumeModalVisible(true);
      } else {
        navigateToGame(false);
      }
    } catch (err) {
      console.error("Error checking active session:", err);
      navigateToGame(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResume = () => {
    setIsResumeModalVisible(false);
    navigateToGame(true);
  };

  const handleStartNewGame = async () => {
    setIsResumeModalVisible(false);
    if (activeSession) {
      setLoading(true);
      try {
        await updateGameSession(activeSession.id, { status: "canceled" });
      } catch (e) {
        console.error("Failed to cancel session:", e);
      } finally {
        setLoading(false);
      }
    }
    navigateToGame(false);
  };

  const navigateToGame = (resume: boolean) => {
    if (gameId) {
      router.push({
        pathname: "/games/blurchette/game",
        params: {
          gameId: gameId.toString(),
          resume: resume.toString(),
        },
      });
    }
  };

  if (loading && !gameId) {
    return (
      <>
        <Header title="Blurchette" variant="withBack" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.survol} />
          <ThemedText style={styles.loadingText}>Chargement...</ThemedText>
        </View>
      </>
    );
  }

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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <MaterialIcons
            name="blur-on"
            size={80}
            color={Colors.primary.survol}
          />
          <ThemedText type="title" style={styles.title}>
            Blurchette
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Devinez les pochettes d&apos;albums floues !
          </ThemedText>
        </View>

        {hasSavedGame && (
          <TouchableOpacity
            style={styles.resumeCard}
            onPress={() => handleStartGame(true)}
            activeOpacity={0.7}
          >
            <View style={styles.resumeInfo}>
              <MaterialIcons
                name="history"
                size={24}
                color={Colors.primary.survol}
              />
              <ThemedText style={styles.resumeText}>
                Vous avez une partie en cours
              </ThemedText>
            </View>
            <View style={styles.resumeBadge}>
              <ThemedText style={styles.resumeBadgeText}>
                Partie en cours
              </ThemedText>
            </View>
          </TouchableOpacity>
        )}

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
            Devinez quelle pochette d&apos;album est affichée alors qu&apos;elle
            est floue. Plus vous trouvez tôt (avec un flou élevé), plus vous
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
                Une pochette d&apos;album très floue apparaît
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
                Devinez l&apos;album et l&apos;artiste le plus tôt possible
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          {hasSavedGame ? (
            <>
              <Button
                title="Reprendre la partie"
                onPress={() => handleStartGame(true)}
                style={styles.playButton}
              />
              <Button
                title="Nouvelle partie"
                variant="outline"
                onPress={() => handleStartGame(false)}
                style={styles.newGameButton}
              />
            </>
          ) : (
            <Button
              title="Commencer à jouer"
              onPress={() => handleStartGame(false)}
              style={styles.playButton}
            />
          )}
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={isResumeModalVisible}
        title="Partie en cours"
        message="Vous avez déjà une partie entamée. Souhaitez-vous la reprendre ou en commencer une nouvelle ?"
        confirmLabel="Reprendre la partie"
        secondaryLabel="Nouvelle partie"
        onSecondary={handleStartNewGame}
        cancelLabel="Annuler"
        onConfirm={handleConfirmResume}
        onCancel={() => setIsResumeModalVisible(false)}
        variant="danger"
      />
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
  resumeCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resumeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resumeText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  resumeBadge: {
    backgroundColor: Colors.primary.survol,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  resumeBadgeText: {
    color: Colors.primary.fondPremier,
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
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
  buttonContainer: {
    marginTop: 20,
    gap: 12,
  },
  playButton: {
    paddingVertical: 16,
  },
  newGameButton: {
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
