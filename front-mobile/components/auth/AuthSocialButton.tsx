import React from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Colors } from "@/constants/Colors";
import { FontAwesome, AntDesign } from "@expo/vector-icons";

type Provider = "spotify" | "google";

type AuthSocialButtonProps = {
  provider: Provider;
  label: string;
  onPress: () => void;
  style?: ViewStyle;
};

const providerStyles: Record<
  Provider,
  { backgroundColor: string; Icon: React.ComponentType<any>; iconName: string }
> = {
  spotify: {
    backgroundColor: "#216E00",
    Icon: FontAwesome,
    iconName: "spotify",
  },
  google: {
    backgroundColor: "#052E30",
    Icon: AntDesign,
    iconName: "google",
  },
};

export const AuthSocialButton: React.FC<AuthSocialButtonProps> = ({
  provider,
  label,
  onPress,
  style,
}) => {
  const config = providerStyles[provider];
  const IconComp = config.Icon;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: config.backgroundColor },
        style,
      ]}
    >
      <View style={styles.content}>
        <IconComp
          name={config.iconName as any}
          size={20}
          color={Colors.light.background}
          style={styles.icon}
        />
        <Text style={styles.label}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 8,
  },
  label: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: "600",
  },
});
