import { Stack } from "expo-router";

export default function HigherOrLowerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="game" />
    </Stack>
  );
}
