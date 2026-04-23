import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";
import { GameMode } from "@/hooks/feature/plusoumoins/usePlusOuMoinsGame";

interface PlusOuMoinsSelectionScreenProps {
  onSelectMode: (mode: GameMode) => void;
}

export function PlusOuMoinsSelectionScreen({
  onSelectMode,
}: PlusOuMoinsSelectionScreenProps) {
  return (
    <View style={styles.container}>
      <Header title="Plus ou moins" variant="withBack" />
      <View style={styles.selectionContent}>
        <ThemedText style={styles.selectionTitle}>
          CHOISISSEZ VOTRE DÉFI
        </ThemedText>
        <View style={styles.modeGrid}>
          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => onSelectMode("artist")}
          >
            <View style={styles.iconBubble}>
              <MaterialIcons name="person" size={40} color="#4FD1D9" />
            </View>
            <ThemedText style={styles.modeText}>Artistes</ThemedText>
            <ThemedText style={styles.modeDescription}>
              Auditeurs mensuels
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => onSelectMode("album")}
          >
            <View style={styles.iconBubble}>
              <MaterialIcons name="album" size={40} color="#4FD1D9" />
            </View>
            <ThemedText style={styles.modeText}>Albums</ThemedText>
            <ThemedText style={styles.modeDescription}>
              Nombre de fans
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary.fondPremier },
  selectionContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  selectionTitle: {
    fontSize: 22,
    marginBottom: 50,
    color: "white",
    fontFamily: "Bold",
    letterSpacing: 2,
    opacity: 0.9,
    textAlign: "center",
  },
  modeGrid: { flexDirection: "row", gap: 15, width: "100%" },
  modeCard: {
    flex: 1,
    height: 210,
    backgroundColor: "#1A2B2C",
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconBubble: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(79, 209, 217, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(79, 209, 217, 0.2)",
  },
  modeText: {
    color: "white",
    fontSize: 20,
    fontFamily: "Author-Bold",
    marginBottom: 6,
  },
  modeDescription: {
    color: "#667A7B",
    fontSize: 9,
    textAlign: "center",
    paddingHorizontal: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
