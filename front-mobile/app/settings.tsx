import { ScrollView, StyleSheet, Text, View } from "react-native";

import Header from "@/components/Header";

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Header title="Paramètres" variant="withBack" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Paramètres à venir</Text>
        <Text style={styles.subtitle}>
          Ajoute ici tes options de compte, notifications ou préférences.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
  },
  content: {
    padding: 16,
    gap: 12,
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Bold",
  },
  subtitle: {
    color: "#D8E7E7",
    fontSize: 14,
  },
});
