import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from "react-native";

type ButtonVariant = "primary" | "secondary" | "outline";
type ButtonSize = "small" | "medium" | "large";

interface ButtonProps {
  title?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title = "Button",
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const buttonStyles = [
    styles.button,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text` as keyof typeof styles],
    styles[`${size}Text` as keyof typeof styles],
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#007AFF"} />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  // Variants
  primary: {
    backgroundColor: "#007AFF",
  },
  secondary: {
    backgroundColor: "#E5E5EA",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  // Sizes
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  // Disabled state
  disabled: {
    opacity: 0.5,
  },
  // Text styles
  text: {
    fontWeight: "600",
  },
  primaryText: {
    color: "#FFFFFF",
  },
  secondaryText: {
    color: "#000000",
  },
  outlineText: {
    color: "#007AFF",
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
});

export default Button;

// Usage examples:
// <Button title="Click Me" onPress={() => console.log('pressed')} />
// <Button title="Secondary" variant="secondary" onPress={handlePress} />
// <Button title="Outline" variant="outline" size="large" onPress={handlePress} />
// <Button title="Loading" loading={true} onPress={handlePress} />
// <Button title="Disabled" disabled={true} onPress={handlePress} />
