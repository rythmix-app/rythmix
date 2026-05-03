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
import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { ToastProvider } from "@/components/Toast";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";

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
  const { status: onboardingStatus } = useOnboardingStatus();
  const onboardingPromptDoneRef = useRef(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isInitializing || !loaded) return;

    const inAuthGroup = segments[0] === "auth";
    const inOnboardingGroup = segments[0] === "onboarding";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/auth/login");
      onboardingPromptDoneRef.current = false;
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
      return;
    }

    if (
      isAuthenticated &&
      onboardingStatus &&
      !onboardingStatus.completed &&
      !onboardingPromptDoneRef.current &&
      !inOnboardingGroup
    ) {
      onboardingPromptDoneRef.current = true;
      router.replace("/onboarding/artists");
    }
  }, [
    isAuthenticated,
    segments,
    isInitializing,
    loaded,
    router,
    onboardingStatus,
  ]);

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
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="integrations" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen
            name="+not-found"
            options={{ headerShown: true, title: "Page introuvable" }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ToastProvider>
    </ThemeProvider>
  );
}
