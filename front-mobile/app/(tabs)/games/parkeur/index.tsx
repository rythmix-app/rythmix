import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import Header from "@/components/Header";
import ConfirmationModal from "@/components/ConfirmationModal";
import RulesModal from "@/components/games/RulesModal";
import GameHistory from "@/components/games/GameHistory";
import { Colors } from "@/constants/Colors";
import { useGameIndex } from "@/hooks/useGameIndex";

export default function ParkeurIndexScreen() {
  const {
    gameId,
    loading,
    error,
    hasPlayedBefore,
    activeSession,
    isRulesModalVisible,
    setIsRulesModalVisible,
    handleStartGame,
    handleStartNewGame,
  } = useGameIndex({
    gameName: "parkeur",
    gamePath: "/games/parkeur/game",
    // Rounds (lyrics + answer lines) are stored server-side in gameData, so we can
    // resume a Parkeur session even after a reinstall or on a different device.
    canResumeFromServer: true,
  });
  const [isConfirmNewGameVisible, setIsConfirmNewGameVisible] = useState(false);

  if (loading && !gameId) {
    return (
      <>
        <Header title="Parkeur" variant="withBack" />
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
        <Header title="Parkeur" variant="withBack" />
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
      <Header title="Parkeur" variant="withBack" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerSection}>
          <MaterialIcons
            name="lyrics"
            size={80}
            color={Colors.primary.survol}
          />
          <ThemedText type="title" style={styles.title}>
            Parkeur
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Complète les paroles à la manière de N&apos;oubliez pas les paroles
          </ThemedText>
        </View>

        {hasPlayedBefore === false && (
          <>
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
                Devinez le 3ᵉ vers d&apos;une chanson en vous basant sur les
                deux vers précédents. Score max : 10/10.
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
                    Choisissez une playlist
                  </ThemedText>
                </View>
                <View style={styles.listItem}>
                  <ThemedText style={styles.listNumber}>2.</ThemedText>
                  <ThemedText style={styles.listText}>
                    Lisez les deux vers affichés et l&apos;indice (un trait par
                    mot manquant)
                  </ThemedText>
                </View>
                <View style={styles.listItem}>
                  <ThemedText style={styles.listNumber}>3.</ThemedText>
                  <ThemedText style={styles.listText}>
                    Tapez le vers suivant. Casse, accents et ponctuation sont
                    ignorés.
                  </ThemedText>
                </View>
              </View>
            </View>
          </>
        )}

        <View style={styles.buttonContainer}>
          {activeSession ? (
            <>
              <Button
                title="Reprendre la partie"
                onPress={() => handleStartGame(true)}
                style={styles.playButton}
              />
              <Button
                title="Nouvelle partie"
                variant="outline"
                onPress={() => setIsConfirmNewGameVisible(true)}
                style={styles.playButton}
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

        {hasPlayedBefore && (
          <TouchableOpacity
            style={styles.rulesButton}
            onPress={() => setIsRulesModalVisible(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="help-outline" size={18} color="#999" />
            <ThemedText style={styles.rulesButtonText}>
              Voir les règles
            </ThemedText>
          </TouchableOpacity>
        )}

        <GameHistory gameId={gameId} gameTitle="Parkeur" />
      </ScrollView>

      <RulesModal
        visible={isRulesModalVisible}
        onClose={() => setIsRulesModalVisible(false)}
        title="Règles — Parkeur"
        objective="Devinez le 3ᵉ vers de la chanson à partir des deux vers précédents"
        steps={[
          { text: "Choisissez une playlist parmi celles proposées" },
          {
            text: "Lisez les deux vers affichés et l'indice de longueur (un trait par mot)",
          },
          { text: "Tapez le vers manquant et validez" },
          { text: "Casse, accents et ponctuation ne comptent pas" },
          {
            text: "10 rounds par partie ; le score s'enregistre à la fin",
          },
        ]}
      />

      <ConfirmationModal
        visible={isConfirmNewGameVisible}
        title="Démarrer une nouvelle partie ?"
        message="Tu as une partie en cours. La lancer va l'abandonner — tu ne pourras plus la reprendre."
        confirmLabel="Oui, nouvelle partie"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={() => {
          setIsConfirmNewGameVisible(false);
          handleStartNewGame();
        }}
        onCancel={() => setIsConfirmNewGameVisible(false)}
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
  headerSection: {
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
  buttonContainer: {
    marginTop: 20,
    gap: 12,
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
  rulesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
  },
  rulesButtonText: {
    color: "#999",
    fontSize: 14,
  },
});
