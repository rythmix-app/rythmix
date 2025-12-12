import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { RythmixLogo } from "../RythmixLogo";
import { Colors } from "@/constants/Colors";

type AuthHeaderProps = {
  baseline?: string;
  style?: ViewStyle;
};

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  baseline = "L'application qui vous fait redécouvrir la musique !",
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <RythmixLogo size={136} />
      <Text style={styles.baseline}>{baseline}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 24,
  },
  baseline: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.primary.survol,
  },
});
