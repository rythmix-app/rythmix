import { View, Text, StyleSheet } from "react-native";

export default function SwipeMixScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Écran SwipeMix</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    color: "white",
  },
});
