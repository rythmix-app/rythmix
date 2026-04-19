import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import Header from "@/components/Header";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useSettingsStore } from "@/stores/settingsStore";

export default function SettingsScreen() {
  const { errorAnimationsEnabled, setErrorAnimationsEnabled } =
    useSettingsStore();

  return (
    <View style={styles.container}>
      <Header title="Paramètres" variant="withBack" />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.sectionTitle}>Jeux</ThemedText>

        <View style={styles.row}>
          <View style={styles.rowText}>
            <ThemedText style={styles.rowLabel}>
              Animations d&apos;erreur
            </ThemedText>
            <ThemedText style={styles.rowDescription}>
              Secousse et bords rouges lors d&apos;une mauvaise réponse
            </ThemedText>
          </View>
          <Switch
            value={errorAnimationsEnabled}
            onValueChange={setErrorAnimationsEnabled}
            trackColor={{
              false: "rgba(255,255,255,0.1)",
              true: Colors.primary.CTA,
            }}
            thumbColor={errorAnimationsEnabled ? Colors.primary.survol : "#888"}
          />
        </View>

        <ThemedText style={styles.sectionTitle}>Intégrations</ThemedText>

        <Pressable
          style={styles.row}
          onPress={() => router.push("/integrations")}
        >
          <View style={styles.rowText}>
            <ThemedText style={styles.rowLabel}>Services musicaux</ThemedText>
            <ThemedText style={styles.rowDescription}>
              Connecte Spotify pour enrichir ton expérience
            </ThemedText>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={22}
            color={Colors.dark.icon}
          />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
  },
  content: {
    padding: 20,
    gap: 8,
  },
  sectionTitle: {
    color: Colors.primary.survol,
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  rowText: {
    flex: 1,
    marginRight: 16,
  },
  rowLabel: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  rowDescription: {
    color: Colors.game.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
