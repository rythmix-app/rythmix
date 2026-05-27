import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router, useLocalSearchParams } from "expo-router";

import Button from "@/components/Button";
import { Colors } from "@/constants/Colors";
import { RythmixLogo } from "@/components/RythmixLogo";

export default function OAuthPendingConfirmationScreen() {
  const { provider, email } = useLocalSearchParams<{
    provider?: string;
    email?: string;
  }>();

  const providerLabel = provider === "google" ? "Google" : "Spotify";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <RythmixLogo size={120} />
        <Text style={styles.title}>Confirme la liaison {providerLabel}</Text>
        <Text style={styles.subtitle}>
          On vient d&apos;envoyer un email de confirmation à
        </Text>
        {email ? <Text style={styles.email}>{email}</Text> : null}
        <Text style={styles.body}>
          Ouvre le lien dans l&apos;email pour autoriser la connexion avec{" "}
          {providerLabel}. Tu peux ensuite revenir dans l&apos;app — tu seras
          connecté automatiquement.
        </Text>

        <View style={styles.actions}>
          <Button
            title="Retour à la connexion"
            variant="primary"
            size="large"
            onPress={() => router.replace("/auth/login")}
            style={styles.button}
          />
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Pas le bon compte ? </Text>
          <Link href="/auth/register" style={styles.bottomLink}>
            Créer un autre compte
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
  },
  email: {
    color: Colors.secondary.turquoise,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
  body: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 20,
  },
  actions: {
    width: "100%",
    marginTop: 32,
    gap: 12,
  },
  button: {
    width: "100%",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
  },
  bottomText: {
    color: "#fff",
    fontSize: 13,
  },
  bottomLink: {
    color: Colors.secondary.turquoise,
    fontSize: 13,
    fontWeight: "600",
  },
});
