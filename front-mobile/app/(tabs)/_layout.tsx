import { Tabs } from "expo-router";
import { View } from "react-native";
import { CustomTabBar } from "@/components/navigation/CustomTabBar";

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#121212" }}>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="swipemix" />
        <Tabs.Screen name="games" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </View>
  );
}
