import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";
import { useEffect } from "react";
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    Regular: require("../assets/fonts/Author-Regular.otf"),
    Bold: require("../assets/fonts/Author-Bold.otf"),
    Light: require("../assets/fonts/Author-Light.otf"),
    Medium: require("../assets/fonts/Author-Medium.otf"),
    Semibold: require("../assets/fonts/Author-Semibold.otf"),
    Extralight: require("../assets/fonts/Author-Extralight.otf"),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="+not-found"
          options={{ headerShown: true, title: "Page introuvable" }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
