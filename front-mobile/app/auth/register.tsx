import Button from "@/components/Button";
import Input from "@/components/Input";
import { Link, router } from "expo-router";
import { RythmixLogo } from "@/components/RythmixLogo";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthStore } from "@/stores/authStore";
import { ApiError } from "@/types/auth";

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptNewsletter, setAcceptNewsletter] = useState(false);
  const { register, isLoading } = useAuthStore();

  const validateForm = () => {
    if (!firstName.trim()) {
      Alert.alert("Erreur", "Le prénom est requis");
      return false;
    }
    if (!lastName.trim()) {
      Alert.alert("Erreur", "Le nom est requis");
      return false;
    }
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
    if (!username.trim()) {
      Alert.alert("Erreur", "Le nom d'utilisateur est requis");
      return false;
    }
    if (!password) {
      Alert.alert("Erreur", "Le mot de passe est requis");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return false;
    }
    if (!acceptTerms) {
      Alert.alert("Erreur", "Vous devez accepter les conditions d'utilisation");
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await register({
        firstName,
        lastName,
        username,
        email,
        password,
      });
      Alert.alert("Succès", "Votre compte a été créé avec succès !", [
        {
          text: "OK",
          onPress: () => router.replace("/auth/login"),
        },
      ]);
    } catch (error) {
      const apiError = error as ApiError;
      Alert.alert("Erreur", apiError.message || "Une erreur est survenue");
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Tagline */}
      <RythmixLogo size={136} />
      <Text style={styles.tagline}>
        Créez. Vibez. Dominez le{" "}
        <Text style={styles.taglineHighlight}>game</Text> musical !
      </Text>

      {/* First Name and Last Name Row */}
      <View style={styles.row}>
        <View style={styles.halfInputWrapper}>
          <Input
            label="Prénom"
            placeholder="Prénom"
            value={firstName}
            onChangeText={setFirstName}
            size="large"
            containerStyle={styles.inputContainer}
            labelStyle={styles.labelStyle}
            editable={!isLoading}
          />
        </View>
        <View style={styles.halfInputWrapper}>
          <Input
            label="Nom"
            placeholder="Nom"
            value={lastName}
            onChangeText={setLastName}
            size="large"
            containerStyle={styles.inputContainer}
            labelStyle={styles.labelStyle}
            editable={!isLoading}
          />
        </View>
      </View>

      {/* Email */}
      <Input
        label="Email"
        placeholder="votre@email.fr"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        size="large"
        containerStyle={styles.inputContainer}
        labelStyle={styles.labelStyle}
        editable={!isLoading}
      />

      {/* Username */}
      <Input
        label="Nom d'utilisateur"
        placeholder="nom_utilisateur"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        size="large"
        containerStyle={styles.inputContainer}
        labelStyle={styles.labelStyle}
        editable={!isLoading}
      />

      {/* Password */}
      <Input
        label="Mot de passe"
        placeholder="************"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        size="large"
        containerStyle={styles.inputContainer}
        labelStyle={styles.labelStyle}
        editable={!isLoading}
      />

      {/* Confirm Password */}
      <Input
        label="Confirmer le mot de passe"
        placeholder="************"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        size="large"
        containerStyle={styles.inputContainer}
        labelStyle={styles.labelStyle}
        editable={!isLoading}
      />

      {/* Checkboxes */}
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setAcceptTerms(!acceptTerms)}
        disabled={isLoading}
      >
        <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
          {acceptTerms && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkboxText}>
          J&apos;accepte les{" "}
          <Text style={styles.link}>Conditions d&apos;utilisation</Text> et la{" "}
          <Text style={styles.link}>Politique de confidentialité</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setAcceptNewsletter(!acceptNewsletter)}
        disabled={isLoading}
      >
        <View
          style={[styles.checkbox, acceptNewsletter && styles.checkboxChecked]}
        >
          {acceptNewsletter && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkboxText}>
          Je souhaite recevoir les actualités et les offres spéciales
        </Text>
      </TouchableOpacity>

      {/* Register Button */}
      <Button
        title={isLoading ? "Création en cours..." : "Créer mon compte"}
        onPress={handleRegister}
        disabled={isLoading}
        style={styles.button}
      />

      {/* Login Link */}
      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Tu as déjà un compte ? </Text>
        <Link href="/auth/login" style={styles.loginLink}>
          Connecte-toi !
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  contentContainer: {
    padding: 24,
    paddingTop: 60,
  },
  tagline: {
    color: "#00D9D9",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
  },
  taglineHighlight: {
    color: "#00D9D9",
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 0,
  },
  halfInputWrapper: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
    padding: 0,
    paddingHorizontal: 0,
    width: "100%",
    alignItems: "flex-start",
  },
  labelStyle: {
    alignSelf: "flex-start",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#00D9D9",
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#00D9D9",
  },
  checkmark: {
    color: "#000",
    fontSize: 14,
    fontWeight: "bold",
  },
  checkboxText: {
    color: "#fff",
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  link: {
    color: "#00D9D9",
    textDecorationLine: "underline",
  },
  button: {
    width: "100%",
    marginTop: 8,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 40,
  },
  loginText: {
    color: "#fff",
    fontSize: 14,
  },
  loginLink: {
    color: "#00D9D9",
    fontSize: 14,
    fontWeight: "600",
  },
});
