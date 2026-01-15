import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Colors } from "@/constants/Colors";
import { LinearGradient } from "expo-linear-gradient";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "validate"
  | "cancel";
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
  const buttonStyles: ViewStyle[] = [
    styles.button,
    ...(variant !== "primary" && variant !== "validate" && variant !== "cancel"
      ? [styles[variant]]
      : []),
    styles[size],
    ...(disabled ? [styles.disabled] : []),
    ...(style ? [style] : []),
  ];

  const textStyles = [
    styles.text,
    styles.primaryText,
    variant !== "primary" && styles[`${variant}Text` as keyof typeof styles],
    styles[`${size}Text` as keyof typeof styles],
    textStyle,
  ];

  const buttonContent = (
    <>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </>
  );

  if (variant === "primary" || variant === "validate" || variant === "cancel") {
    let gradientColors: [string, string] = [
      Colors.primary.CTADark,
      Colors.primary.CTA,
    ];

    if (variant === "validate") {
      gradientColors = ["#216E00", "#40D400"];
    } else if (variant === "cancel") {
      gradientColors = ["#6E0000", "#D40000"];
    }

    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.7}
        style={[styles.button, disabled && styles.disabled, style]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 1]}
          style={[styles.gradient, styles[size]]}
        >
          {buttonContent}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {buttonContent}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  gradient: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 50,
  },
  // Variants
  primary: {
    backgroundColor: "transparent",
  },
  secondary: {
    backgroundColor: "#",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.primary.CTA,
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
    color: Colors.primary.CTA,
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
// <Button title="Valider" variant="validate" onPress={handlePress} />
// <Button title="Annuler" variant="cancel" onPress={handlePress} />
// <Button title="Secondary" variant="secondary" onPress={handlePress} />
// <Button title="Outline" variant="outline" size="large" onPress={handlePress} />
// <Button title="Loading" loading={true} onPress={handlePress} />
// <Button title="Disabled" disabled={true} onPress={handlePress} />
