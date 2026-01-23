import { Stack } from "expo-router";

export default function GamesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Jeux" }} />
    </Stack>
  );
}
