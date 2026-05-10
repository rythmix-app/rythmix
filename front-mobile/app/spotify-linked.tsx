import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/Colors";

export default function SpotifyLinkedScreen() {
  useLocalSearchParams<{ status?: string; reason?: string }>();

  useEffect(() => {
    const t = setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/profile");
      }
    }, 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary.survol} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary.fondPremier,
  },
});
