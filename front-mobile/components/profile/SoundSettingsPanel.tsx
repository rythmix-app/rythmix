import React from "react";
import { View, Text, Switch, StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";
import { useSoundSettingsStore } from "@/stores/soundSettingsStore";

export default function SoundSettingsPanel() {
  const {
    swipeSoundsEnabled,
    gameSoundsEnabled,
    setSwipeSoundsEnabled,
    setGameSoundsEnabled,
  } = useSoundSettingsStore();

  return (
    <View style={styles.container}>
      <ToggleRow
        label="Sons des swipes"
        value={swipeSoundsEnabled}
        onValueChange={setSwipeSoundsEnabled}
      />
      <View style={styles.divider} />
      <ToggleRow
        label="Sons des jeux"
        value={gameSoundsEnabled}
        onValueChange={setGameSoundsEnabled}
      />
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#2A2A2A", true: Colors.primary.CTADark }}
        thumbColor={value ? Colors.primary.survol : "#9BA1A6"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  label: {
    fontSize: 15,
    color: Colors.dark.text,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#2A2A2A",
    marginHorizontal: 14,
  },
});
