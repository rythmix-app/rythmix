import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import Header from "@/components/Header";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const headerTitles: Record<string, string> = {
    index: "Accueil",
    swipemix: "SwipeMix",
    explore: "Explore",
    profile: "Profil",
    games: "Jeux",
  };

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: true,
        header: () => (
          <Header
            title={headerTitles[route.name] ?? route.name}
            variant="withMenu"
          />
        ),
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: "absolute",
          },
          default: {},
        }),
      })}
    >
      {/* Accueil */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      {/* SwipeMix */}
      <Tabs.Screen
        name="swipemix"
        options={{
          title: "SwipeMix",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="shuffle" color={color} />
          ),
        }}
      />

      {/* Profil (layout dédié) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.fill" color={color} />
          ),
        }}
      />

      {/* Jeux (layout dédié) */}
      <Tabs.Screen
        name="games"
        options={{
          title: "Jeux",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="gamecontroller.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
