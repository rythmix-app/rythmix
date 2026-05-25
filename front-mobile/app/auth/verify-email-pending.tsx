import React, { useEffect, useState } from "react";
import { Link, router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";

import Button from "@/components/Button";
import { Colors } from "@/constants/Colors";
import { RythmixLogo } from "@/components/RythmixLogo";
import { resendVerificationEmail } from "@/services/authService";
import { useToast } from "@/components/Toast";
import { ApiError } from "@/types/auth";
import { getErrorMessage } from "@/utils/error-messages";

const VERIFY_EMAIL_DEEP_LINK_PATH = "verify-email";

export default function VerifyEmailPendingScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { show } = useToast();
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const handleIncomingUrl = (url: string) => {
      const parsed = Linking.parse(url);
      if (parsed.path !== VERIFY_EMAIL_DEEP_LINK_PATH) return;

      const status = parsed.queryParams?.status;
      if (status === "ok") {
        show({
          type: "success",
          message: "Email vérifié, tu peux maintenant te connecter.",
        });
        router.replace("/auth/login");
        return;
      }

      const reason =
        typeof parsed.queryParams?.reason === "string"
          ? parsed.queryParams.reason
          : undefined;
      show({
        type: "error",
        message:
          getErrorMessage(reason) ??
          "La vérification a échoué. Demande un nouveau mail.",
      });
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleIncomingUrl(url);
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleIncomingUrl(url);
    });
    return () => subscription.remove();
  }, [show]);

  const handleResend = async () => {
    if (!email) {
      show({
        type: "error",
        message: "Aucune adresse email fournie",
      });
      return;
    }
    setIsResending(true);
    try {
      await resendVerificationEmail(email);
      show({
        type: "success",
        message: "Un nouvel email de vérification t'a été envoyé",
      });
    } catch (error) {
      const apiError = error as ApiError;
      show({
        type: "error",
        message:
          getErrorMessage(apiError.code) ??
          apiError.message ??
          "Impossible d'envoyer l'email",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <RythmixLogo size={120} />
        <Text style={styles.title}>Vérifie ton email</Text>
        <Text style={styles.subtitle}>
          On vient d&apos;envoyer un lien de vérification à
        </Text>
        {email ? <Text style={styles.email}>{email}</Text> : null}
        <Text style={styles.body}>
          Ouvre l&apos;email et clique sur le lien pour activer ton compte.
        </Text>

        <View style={styles.actions}>
          <Button
            title={isResending ? "Envoi en cours..." : "Renvoyer l'email"}
            variant="primary"
            size="large"
            onPress={handleResend}
            disabled={isResending}
            style={styles.button}
          />
          <Button
            title="Retour à la connexion"
            variant="secondary"
            size="large"
            onPress={() => router.replace("/auth/login")}
            style={styles.button}
          />
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Mauvaise adresse ? </Text>
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
    fontSize: 24,
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
