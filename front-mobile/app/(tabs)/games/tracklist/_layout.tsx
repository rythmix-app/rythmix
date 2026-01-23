import { Stack } from "expo-router";

export default function TracklistLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="game" />
    </Stack>
  );
}
