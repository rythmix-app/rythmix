import React, { forwardRef } from "react";
import {
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  disabled?: boolean; // default: !value.trim()
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const GameAnswerInput = forwardRef<TextInput, Props>(
  (
    {
      value,
      onChangeText,
      onSubmit,
      placeholder,
      disabled = !value.trim(),
      accessibilityLabel,
      accessibilityHint,
    },
    ref,
  ) => {
    return (
      <View style={styles.container}>
        <TextInput
          ref={ref}
          style={styles.input}
          value={value}
          onChangeText={(text) => onChangeText(text.toUpperCase())}
          placeholder={placeholder}
          placeholderTextColor="#666"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="send"
          onSubmitEditing={onSubmit}
          blurOnSubmit={false}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
        />
        <TouchableOpacity
          style={[styles.sendButton, disabled && styles.sendButtonDisabled]}
          onPress={onSubmit}
          disabled={disabled}
          accessibilityLabel="Valider la réponse"
          accessibilityRole="button"
        >
          <MaterialIcons
            name="send"
            size={22}
            color={disabled ? "#666" : "white"}
          />
        </TouchableOpacity>
      </View>
    );
  },
);

GameAnswerInput.displayName = "GameAnswerInput";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    color: "white",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    fontFamily: "Bold",
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary.survol,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
});
