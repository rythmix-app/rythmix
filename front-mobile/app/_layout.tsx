import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

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

  const { isAuthenticated, isInitializing, checkAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isInitializing || !loaded) return;

    const inAuthGroup = segments[0] === "auth";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/auth/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, segments, isInitializing, loaded, router]);

  useEffect(() => {
    if ((loaded || error) && !isInitializing) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error, isInitializing]);

  if (!loaded && !error) {
    return null;
  }

  if (isInitializing) {
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
