import { Stack } from "expo-router";

export default function IntegrationsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Intégrations" }} />
      <Stack.Screen
        name="spotify-stats"
        options={{ title: "Mes stats Spotify" }}
      />
    </Stack>
  );
}
