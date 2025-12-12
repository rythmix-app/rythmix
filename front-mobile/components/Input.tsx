import React, { useState } from "react";
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from "react-native";

type InputSize = "small" | "medium" | "large";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  size?: InputSize;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  size = "medium",
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const inputStyles = [
    styles.input,
    styles[size],
    isFocused && styles.focused,
    error && styles.error,
    inputStyle,
  ];

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
      <TextInput
        style={inputStyles}
        onFocus={(e) => {
          setIsFocused(true);
          textInputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          textInputProps.onBlur?.(e);
        }}
        placeholderTextColor="#666"
        {...textInputProps}
      />
      {error && <Text style={[styles.errorText, errorStyle]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: "#0D7377",
    borderRadius: 12,
    backgroundColor: "#000",
    color: "#fff",
  },
  // Sizes
  small: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  medium: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 16,
  },
  large: {
    paddingVertical: 18,
    paddingHorizontal: 22,
    fontSize: 18,
  },
  // States
  focused: {
    borderColor: "#40D400",
  },
  error: {
    borderColor: "#D40000",
  },
  errorText: {
    color: "#D40000",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "500",
  },
});

export default Input;

// Usage examples:
// <Input label="Prénom" placeholder="Prénom" />
// <Input label="Email" placeholder="votre@email.fr" keyboardType="email-address" />
// <Input label="Nom d'utilisateur" placeholder="nom_utilisateur" />
// <Input label="Mot de passe" placeholder="************" secureTextEntry />
// <Input label="Email" error="Email invalide" placeholder="votre@email.fr" />
