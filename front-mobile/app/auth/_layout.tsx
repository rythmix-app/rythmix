import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="login" options={{ title: "Connexion" }} />
      <Stack.Screen name="register" options={{ title: "Inscription" }} />
      <Stack.Screen
        name="oauth-callback"
        options={{ title: "Connexion en cours" }}
      />
      <Stack.Screen
        name="oauth-pending-confirmation"
        options={{ title: "Confirmation requise" }}
      />
    </Stack>
  );
}
