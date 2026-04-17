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
import { Colors } from "@/constants/Colors";
import { useGameIndex } from "@/hooks/useGameIndex";

export default function HigherOrLowerIndexScreen() {
  const {
    gameId,
    loading,
    error,
    hasSavedGame,
    hasPlayedBefore,
    isResumeModalVisible,
    setIsResumeModalVisible,
    isRulesModalVisible,
    setIsRulesModalVisible,
    handleStartGame,
    handleConfirmResume,
    handleStartNewGame,
  } = useGameIndex({
    gameName: "plus ou moins",
    gamePath: "/games/plusoumoins/game",
  });

  if (loading && !gameId) {
    return (
      <>
        <Header title="Plus ou moins" variant="withBack" />
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
        <Header title="Plus ou moins" variant="withBack" />
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
      <Header title="Plus ou moins" variant="withBack" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <MaterialIcons
            name="swap-vert"
            size={80}
            color={Colors.primary.survol}
          />
          <ThemedText type="title" style={styles.title}>
            Plus ou moins
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Cet artiste a-t-il plus ou moins d&apos;auditeurs ?
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
                Devinez si l&apos;artiste mystère a plus ou moins
                d&apos;auditeurs mensuels que l&apos;artiste affiché. Testez vos
                connaissances sur la popularité des artistes !
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
                    Un artiste s&apos;affiche en haut avec son nombre
                    d&apos;auditeurs
                  </ThemedText>
                </View>
                <View style={styles.listItem}>
                  <ThemedText style={styles.listNumber}>2.</ThemedText>
                  <ThemedText style={styles.listText}>
                    Un second artiste apparaît en bas, son score est caché
                  </ThemedText>
                </View>
                <View style={styles.listItem}>
                  <ThemedText style={styles.listNumber}>3.</ThemedText>
                  <ThemedText style={styles.listText}>
                    Appuyez sur PLUS ou MOINS selon votre instinct
                  </ThemedText>
                </View>
                <View style={styles.listItem}>
                  <ThemedText style={styles.listNumber}>4.</ThemedText>
                  <ThemedText style={styles.listText}>
                    Bonne réponse : l&apos;artiste du bas monte, un nouveau
                    challenger arrive
                  </ThemedText>
                </View>
                <View style={styles.listItem}>
                  <ThemedText style={styles.listNumber}>5.</ThemedText>
                  <ThemedText style={styles.listText}>
                    Mauvaise réponse : la partie se termine
                  </ThemedText>
                </View>
              </View>
            </View>
          </>
        )}

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
      </ScrollView>

      <RulesModal
        visible={isRulesModalVisible}
        onClose={() => setIsRulesModalVisible(false)}
        title="Règles — Plus ou moins"
        objective="Devinez si l'artiste mystère a plus ou moins d'auditeurs mensuels que l'artiste affiché"
        steps={[
          { text: "Un artiste s'affiche en haut avec son nombre d'auditeurs" },
          { text: "Un second artiste apparaît en bas, son score est caché" },
          { text: "Appuie sur PLUS ou MOINS selon ton instinct" },
          {
            text: "Bonne réponse : l'artiste du bas monte, un nouveau challenger arrive",
          },
          { text: "Mauvaise réponse : la partie se termine" },
        ]}
      />

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
