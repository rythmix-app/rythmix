import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { TabItem } from "./TabItem";

const BG_COLOR = "#121212";
const ACTIVE_COLOR = "#0D7377";

// Réglages d’équilibre validés
const ACTIVE_FLEX = 1.7;
const INACTIVE_FLEX = 1.0;

type TabConfig = {
  icon: any;
  label: string;
};

const TAB_CONFIG: Record<string, TabConfig> = {
  index: { icon: "home-outline", label: "Home" },
  swipemix: { icon: "heart-outline", label: "Swipemix" },
  games: { icon: "game-controller-outline", label: "Jeux" },
  profile: { icon: "person-outline", label: "Profil" },
};

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const flexValues = useRef<Animated.Value[]>([]);

  if (flexValues.current.length !== state.routes.length) {
    flexValues.current = state.routes.map((_, i) => {
      return new Animated.Value(
        i === state.index ? ACTIVE_FLEX : INACTIVE_FLEX,
      );
    });
  }

  useEffect(() => {
    flexValues.current.forEach((value, i) => {
      Animated.timing(value, {
        toValue: i === state.index ? ACTIVE_FLEX : INACTIVE_FLEX,
        duration: 180,
        useNativeDriver: false,
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

        return (
          <Animated.View
            key={route.key}
            style={{
              flex: flexValues.current[index],
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TabItem
              icon={cfg.icon}
              label={cfg.label}
              active={isFocused}
              activeBg={ACTIVE_COLOR}
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

    // ✅ séparation nette avec le contenu
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",

    paddingTop: 12,
    paddingHorizontal: 12,
    alignItems: "center",

    // Ombre douce pour l’effet “posé”
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
});
