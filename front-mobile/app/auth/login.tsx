import React, { useState } from "react";
import {
  Alert,
  View,
  Text,
  StyleSheet,
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
import { AuthSeparator } from "@/components/auth/AuthSeparator";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { useAuthStore } from "@/stores/authStore";
import { ApiError } from "@/types/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading } = useAuthStore();

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert("Erreur", "L'email est requis");
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Erreur", "L'email n'est pas valide");
      return false;
    }
    if (!password) {
      Alert.alert("Erreur", "Le mot de passe est requis");
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await login({ email, password });
      router.replace("/(tabs)");
    } catch (error) {
      const apiError = error as ApiError;
      Alert.alert("Erreur", apiError.message || "Une erreur est survenue");
    }
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
              <Input
                label="Email"
                placeholder="votre@email.fr"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                size="large"
                containerStyle={styles.inputContainer}
                placeholderTextColor="#888"
                editable={!isLoading}
              />

              <Input
                label="Mot de passe"
                placeholder="********"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                size="large"
                containerStyle={styles.inputContainer}
                placeholderTextColor="#888"
                editable={!isLoading}
              />

              <TouchableOpacity
                onPress={() => {
                  // TODO: mot de passe oublié
                }}
                disabled={isLoading}
              >
                <Text style={styles.forgotPwd}>Mot de passe oublié ?</Text>
              </TouchableOpacity>

              <Button
                title={isLoading ? "Connexion en cours..." : "Se connecter"}
                variant="primary"
                size="large"
                onPress={handleLogin}
                disabled={isLoading}
                style={{ marginTop: 24, width: "100%" }}
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
  inputContainer: {
    marginBottom: 12,
    padding: 0,
    alignItems: "stretch",
  },
  bottomLink: {
    color: Colors.secondary.turquoise,
    fontSize: 13,
    fontWeight: "600",
  },
});
