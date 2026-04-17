import { Stack } from "expo-router";

export default function GamesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{
          title: "Jeux",
        }}
      />
      <Stack.Screen
        name="blurchette"
        options={{
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="tracklist"
        options={{
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="blindtest"
        options={{
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="plusoumoins"
        options={{
          presentation: "card",
        }}
      />
    </Stack>
  );
}
