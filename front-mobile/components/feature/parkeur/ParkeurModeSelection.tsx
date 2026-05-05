import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import type { ParkeurMode } from "@/hooks/feature/parkeur/useParkeurGame";

interface Props {
  onSelect: (mode: Exclude<ParkeurMode, "pick">) => void;
}

export default function ParkeurModeSelection({ onSelect }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedText type="title" style={styles.title}>
        Choisis ta source
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        Joue sur une playlist toute prête, ou sur les morceaux les plus connus
        d&apos;un artiste de ton choix.
      </ThemedText>

      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => onSelect("playlist")}
        accessibilityRole="button"
        accessibilityLabel="Mode playlist"
      >
        <MaterialIcons
          name="queue-music"
          size={42}
          color={Colors.primary.survol}
        />
        <View style={styles.cardText}>
          <ThemedText style={styles.cardTitle}>Playlist</ThemedText>
          <ThemedText style={styles.cardDescription}>
            Choisis parmi les playlists Rythmix.
          </ThemedText>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => onSelect("artist")}
        accessibilityRole="button"
        accessibilityLabel="Mode artiste"
      >
        <MaterialIcons
          name="person-search"
          size={42}
          color={Colors.primary.survol}
        />
        <View style={styles.cardText}>
          <ThemedText style={styles.cardTitle}>Artiste</ThemedText>
          <ThemedText style={styles.cardDescription}>
            Cherche un artiste, on tire au sort dans ses tubes.
          </ThemedText>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary.fondPremier },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  title: { color: "white", textAlign: "center", marginBottom: 4 },
  subtitle: {
    color: "#999",
    textAlign: "center",
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  cardText: { flex: 1 },
  cardTitle: { color: "white", fontSize: 18, fontWeight: "600" },
  cardDescription: { color: "#999", fontSize: 13, marginTop: 4 },
});
