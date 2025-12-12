import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";

import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { Colors } from "@/constants/Colors";
import { AuthSocialButton } from "@/components/auth/AuthSocialButton";
import { AuthPrimaryButton } from "@/components/auth/AuthPrimaryButton";
import { AuthSeparator } from "@/components/auth/AuthSeparator";

export default function LoginScreen() {
  const handleLogin = () => {
    // TODO: logique d’auth
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={styles.inner}>
            <AuthHeader />

            <View style={styles.socialContainer}>
              <AuthSocialButton
                provider="spotify"
                label="Continuer avec Spotify"
                onPress={() => {
                  // TODO: logique OAuth Spotify
                }}
                style={{ marginBottom: 12 }}
              />

              <AuthSocialButton
                provider="google"
                label="Continuer avec Google"
                onPress={() => {
                  // TODO: logique OAuth Google
                }}
              />
            </View>

            <AuthSeparator />

            <View style={styles.form}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                placeholder="votre@email.fr"
                placeholderTextColor="#888"
                style={styles.input}
                keyboardType="email-address"
              />

              <Text style={styles.label}>Mot de passe</Text>
              <TextInput
                placeholder="********"
                placeholderTextColor="#888"
                secureTextEntry
                style={styles.input}
              />

              <TouchableOpacity
                onPress={() => {
                  // TODO: mot de passe oublié
                }}
              >
                <Text style={styles.forgotPwd}>Mot de passe oublié ?</Text>
              </TouchableOpacity>

              <AuthPrimaryButton
                title="Se connecter"
                onPress={handleLogin}
                style={{ marginTop: 24 }}
              />

              <View style={styles.bottomRow}>
                <Text style={styles.bottomText}>
                  Tu n’as pas encore de compte ?{" "}
                </Text>
                <Link href="/auth/register" style={styles.bottomLink}>
                  Créer un compte
                </Link>
              </View>
            </View>

            <AuthFooter
            // onPressTerms={() => router.push("/legal/terms")}
            // onPressPrivacy={() => router.push("/legal/privacy")}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    justifyContent: "space-between",
  },
  form: {
    paddingHorizontal: 24,
  },
  label: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.primary.CTA,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.light.background,
  },
  forgotPwd: {
    marginTop: 8,
    alignSelf: "flex-end",
    fontSize: 12,
    color: Colors.secondary.turquoise,
  },
  socialContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  bottomText: {
    color: Colors.light.background,
    fontSize: 13,
  },
  bottomLink: {
    color: Colors.secondary.turquoise,
    fontSize: 13,
    fontWeight: "600",
  },
});
