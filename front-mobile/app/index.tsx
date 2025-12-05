import { Redirect } from "expo-router";

export default function Index() {
  // TODO: à remplacer par ta vraie logique d'auth
  const isAuthenticated = false;

  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
