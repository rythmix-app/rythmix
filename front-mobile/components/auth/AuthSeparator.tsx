import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Colors } from "@/constants/Colors";

type AuthSeparatorProps = {
  label?: string;
  style?: ViewStyle;
};

export const AuthSeparator: React.FC<AuthSeparatorProps> = ({
  label = "OU",
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#FFFFFF40",
  },
  label: {
    marginHorizontal: 12,
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: "600",
  },
});
