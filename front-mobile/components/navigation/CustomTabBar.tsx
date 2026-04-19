import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { TabItem } from "./TabItem";
import {
  IconlyHome,
  IconlyHeart,
  IconlyGame,
  IconlyProfile,
} from "@/components/icons/Iconly";

const BG_COLOR = "#121212";
const ACTIVE_COLOR = "#0D7377";

// Réglages d’équilibre (compact + icônes plus présentes)
const ACTIVE_FLEX = 1.7;
const INACTIVE_FLEX = 1.0;

type TabConfig = {
  icon: any; // ComponentType<IconlyIconProps> si tu veux typer strict
  label: string;
  edge?: "left" | "right" | "none";
};

const TAB_CONFIG: Record<string, TabConfig> = {
  index: { icon: IconlyHome, label: "Home", edge: "left" },
  swipemix: { icon: IconlyHeart, label: "Swipemix", edge: "none" },
  games: { icon: IconlyGame, label: "Jeux", edge: "none" },
  profile: { icon: IconlyProfile, label: "Profil", edge: "right" },
};

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // 1 Animated.Value par route (persistant)
  const flexValues = useRef<Animated.Value[]>([]);

  // init / resize si le nombre de routes change
  if (flexValues.current.length !== state.routes.length) {
    flexValues.current = state.routes.map((_, i) => {
      const isFocused = i === state.index;
      return new Animated.Value(isFocused ? ACTIVE_FLEX : INACTIVE_FLEX);
    });
  }

  // animation du flex à chaque changement d’onglet
  useEffect(() => {
    flexValues.current.forEach((value, i) => {
      Animated.timing(value, {
        toValue: i === state.index ? ACTIVE_FLEX : INACTIVE_FLEX,
        duration: 180,
        useNativeDriver: false, // flex n’est pas supporté en native
      }).start();
    });
  }, [state.index]);

  const handlePress = (routeName: string, isFocused: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isFocused) {
      navigation.navigate(routeName);
    }
  };

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const cfg = TAB_CONFIG[route.name];
        if (!cfg) return null;

        // Aligner l’item actif vers l’intérieur si bord
        const edge = cfg.edge ?? "none";
        const alignItems =
          isFocused && edge === "left"
            ? "flex-start"
            : isFocused && edge === "right"
              ? "flex-end"
              : "center";

        return (
          <Animated.View
            key={route.key}
            style={{
              flex: flexValues.current[index],
              alignItems,
              justifyContent: "center",
            }}
          >
            <TabItem
              icon={cfg.icon}
              label={cfg.label}
              active={isFocused}
              activeBg={ACTIVE_COLOR}
              inactiveColor="#FFFFFF"
              onPress={() => handlePress(route.name, isFocused)}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: BG_COLOR,

    // séparation nette entre contenu et tab bar (sans radius)
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",

    paddingTop: 12,
    paddingHorizontal: 12,
    alignItems: "center",

    // Ombre douce (iOS + Android)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
});
