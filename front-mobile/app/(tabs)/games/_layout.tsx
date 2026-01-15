import { Stack } from "expo-router";

export default function GamesLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          title: "Jeux",
        }}
      />
      <Stack.Screen
        name="blurchette"
        options={{
          headerShown: false,
          presentation: "card",
        }}
      />
    </Stack>
  );
}
