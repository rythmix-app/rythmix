import { ActivityIndicator, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";

interface BlindtestReadyScreenProps {
  totalRounds: number;
  loading: boolean;
  onStart: () => void;
}

export default function BlindtestReadyScreen({
  totalRounds,
  loading,
  onStart,
}: BlindtestReadyScreenProps) {
  return (
    <>
      <Header title="Blind Test" variant="withBack" />
      <View style={styles.container}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color={Colors.primary.survol} />
            <ThemedText style={styles.loadingText}>
              Chargement des morceaux...
            </ThemedText>
          </>
        ) : (
          <>
            <MaterialIcons
              name="headset"
              size={80}
              color={Colors.primary.survol}
            />
            <ThemedText type="title" style={styles.title}>
              Tout est prêt !
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {totalRounds} morceaux chargés
            </ThemedText>
            <Button
              title="Commencer"
              onPress={onStart}
              style={styles.startButton}
            />
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 16,
  },
  loadingText: {
    color: "#999",
    fontSize: 16,
    marginTop: 10,
  },
  title: {
    textAlign: "center",
    marginTop: 10,
  },
  subtitle: {
    color: "#999",
    fontSize: 18,
    textAlign: "center",
  },
  startButton: {
    width: "100%",
    paddingVertical: 16,
    marginTop: 20,
  },
});
