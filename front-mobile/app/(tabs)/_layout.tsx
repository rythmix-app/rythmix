import { Tabs } from "expo-router";
import React from "react";
import { View } from "react-native";

import Header from "@/components/Header";
import { CustomTabBar } from "@/components/navigation/CustomTabBar";

const TITLES: Record<string, string> = {
  index: "Accueil",
  swipemix: "SwipeMix",
  explore: "Explore",
  profile: "Profil",
  games: "Jeux",
};

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#121212" }}>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: true,
          header: () => (
            <Header title={TITLES[route.name] ?? route.name} variant="withMenu" />
          ),
        })}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="swipemix" />
        <Tabs.Screen name="games" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="explore" />
      </Tabs>
    </View>
  );
}
