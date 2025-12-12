import React from "react";
import { View, Text, StyleSheet, Image, ViewStyle } from "react-native";
import { Colors } from "@/constants/Colors";

type RythmixLogoProps = {
  size?: number;
  style?: ViewStyle;
};

export const RythmixLogo: React.FC<RythmixLogoProps> = ({
  size = 96,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Image
        source={require("../assets/images/logo-rythmix-light.png")}
        style={{ width: size, height: size }}
      />
      <Text style={styles.title}>RYTHMIX</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  logoPlaceholder: {
    backgroundColor: Colors.primary.CTA,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: Colors.primary.fondPremier,
    fontWeight: "bold",
  },
  title: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 4,
    color: Colors.light.background,
  },
});
