import React from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { Colors } from "@/constants/Colors";
import { RythmixLogo } from "./RythmixLogo";

export const LoadingScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <RythmixLogo size={120} />
      </View>
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={Colors.secondary.turquoise} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
  },
  logoContainer: {
    marginTop: 60,
    alignItems: "center",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 100, // Offset to visually center better
  },
});

export default LoadingScreen;
