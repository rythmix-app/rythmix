import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Href, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextStyle,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";

export interface HeaderProps {
  title: string;
  showSettings?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  onSettings?: () => void;
  variant?: "simple" | "withMenu" | "withBack";
  style?: ViewStyle;
  titleStyle?: TextStyle;
}

export default function Header({
  title,
  showSettings,
  showBack,
  onBack,
  onSettings,
  variant = "simple",
  style,
  titleStyle,
}: HeaderProps) {
  const { top } = useSafeAreaInsets();

  const hasBack =
    typeof showBack === "boolean" ? showBack : variant === "withBack";
  const wantsCenteredTitle = variant === "withBack" || hasBack;
  const hasSettings =
    typeof showSettings === "boolean"
      ? showSettings
      : variant === "withMenu";
  const shouldAddGap = hasBack || hasSettings || wantsCenteredTitle;

  const handleBackPress = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleSettingsPress = () => {
    if (onSettings) {
      onSettings();
      return;
    }
    router.push("/settings" as Href);
  };

  return (
    <LinearGradient
      colors={["#00BFA5", Colors.secondary.turquoise]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        { paddingTop: top + 12 },
        style,
      ]}
    >
      <View
        style={[
          styles.content,
          shouldAddGap && styles.contentGapped,
        ]}
      >
        <View
          style={[
            styles.sideSlot,
            !hasBack &&
              (wantsCenteredTitle ? styles.slotPlaceholder : styles.slotCollapsed),
          ]}
        >
          {hasBack && (
            <TouchableOpacity
              onPress={handleBackPress}
              activeOpacity={0.8}
              style={styles.iconButton}
              accessibilityLabel="Retour"
            >
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        <Text
          numberOfLines={1}
          accessibilityRole="header"
          style={[
            styles.title,
            wantsCenteredTitle ? styles.titleCentered : styles.titleLeft,
            titleStyle,
          ]}
        >
          {title}
        </Text>

        <View
          style={[
            styles.sideSlot,
            hasSettings
              ? undefined
              : wantsCenteredTitle
                ? styles.slotPlaceholder
                : styles.slotCollapsed,
          ]}
        >
          {hasSettings && (
            <TouchableOpacity
              onPress={handleSettingsPress}
              activeOpacity={0.8}
              style={styles.iconButton}
              accessibilityLabel="Ouvrir les paramètres"
            >
              <Ionicons name="settings-sharp" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  contentGapped: {
    gap: 12,
  },
  sideSlot: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  slotPlaceholder: {
    width: 48,
  },
  slotCollapsed: {
    width: 0,
  },
  title: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 24,
    fontFamily: "Bold",
  },
  titleCentered: {
    textAlign: "center",
  },
  titleLeft: {
    textAlign: "left",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
});
