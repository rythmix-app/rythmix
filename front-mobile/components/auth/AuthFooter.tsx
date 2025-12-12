// src/components/auth/AuthFooter.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";

type AuthFooterProps = {
  onPressTerms?: () => void;
  onPressPrivacy?: () => void;
  copyrightText?: string;
};

export const AuthFooter: React.FC<AuthFooterProps> = ({onPressTerms, onPressPrivacy, copyrightText = "© 2025 Rythmix. Tous droits réservés.", }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.infoText}>
        En vous connectant, vous acceptez nos{" "}
        <Text style={styles.linkText} onPress={onPressTerms}>
          Conditions d&apos;utilisation
        </Text>{" "}
        et notre{" "}
        <Text style={styles.linkText} onPress={onPressPrivacy}>
          Politique de confidentialité
        </Text>
        .
      </Text>

      <Text style={styles.copyright}>{copyrightText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: "center",
  },
  infoText: {
    fontSize: 11,
    textAlign: "center",
    color: Colors.light.background,
    marginBottom: 8,
  },
  linkText: {
    color: Colors.secondary.turquoise,
  },
  copyright: {
    fontSize: 10,
    color: "#777777",
    textAlign: "center",
  },
});
