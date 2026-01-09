import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";

const PasswordStrengthIndicator = ({ password }) => {
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  const calculateStrength = () => {
    if (!password || password.length === 0) {
      return { strength: 0, criteria: {} };
    }

    const criteria = {
      length: password.length >= 8,
      lengthStrong: password.length >= 12,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;'/`~]/.test(password),
    };

    let strength = 0;

    // Faible (25%) : Moins de 8 caractères OU seulement des minuscules
    if (password.length < 8) {
      strength = 25;
    }
    // Moyen (50%) : 8+ caractères + (minuscules + majuscules) OU (minuscules + chiffres)
    else if (
      criteria.length &&
      criteria.lowercase &&
      (criteria.uppercase || criteria.number) &&
      !(criteria.uppercase && criteria.number)
    ) {
      strength = 50;
    }
    // Bon (75%) : 8+ caractères + minuscules + majuscules + chiffres (mais pas 12+ ou pas de spéciaux)
    else if (
      criteria.length &&
      criteria.lowercase &&
      criteria.uppercase &&
      criteria.number &&
      (!criteria.lengthStrong || !criteria.special)
    ) {
      strength = 75;
    }
    // Fort (100%) : 12+ caractères + minuscules + majuscules + chiffres + spéciaux
    else if (
      criteria.lengthStrong &&
      criteria.lowercase &&
      criteria.uppercase &&
      criteria.number &&
      criteria.special
    ) {
      strength = 100;
    }
    // Si 8+ caractères mais ne rentre dans aucune catégorie (ex: que des majuscules)
    else if (criteria.length) {
      strength = 25;
    }

    return { strength, criteria };
  };

  const { strength, criteria } = calculateStrength();

  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: strength,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [strength]);

  const getStrengthColor = () => {
    if (strength === 0) return "#666";
    if (strength === 25) return "#FF4444";
    if (strength === 50) return "#FFA500";
    if (strength === 75) return "#FFD700";
    return "#00D9D9";
  };

  const getStrengthLabel = () => {
    if (strength === 0) return "";
    if (strength === 25) return "Faible";
    if (strength === 50) return "Moyen";
    if (strength === 75) return "Bon";
    return "Fort";
  };

  if (!password) return null;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthHeader}>
        <Text style={styles.strengthLabel}>
          Force du mot de passe :{" "}
          <Text style={[styles.strengthValue, { color: getStrengthColor() }]}>
            {getStrengthLabel()}
          </Text>
        </Text>
      </View>

      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressWidth,
              backgroundColor: getStrengthColor(),
            },
          ]}
        />
      </View>

      <View style={styles.criteriaContainer}>
        <View style={styles.criteriaRow}>
          <Text
            style={[
              styles.criteriaIcon,
              criteria.length ? styles.criteriaValid : styles.criteriaInvalid,
            ]}
          >
            {criteria.length ? "✓" : "✗"}
          </Text>
          <Text style={styles.criteriaText}>Au moins 8 caractères</Text>
        </View>

        <View style={styles.criteriaRow}>
          <Text
            style={[
              styles.criteriaIcon,
              criteria.uppercase
                ? styles.criteriaValid
                : styles.criteriaInvalid,
            ]}
          >
            {criteria.uppercase ? "✓" : "✗"}
          </Text>
          <Text style={styles.criteriaText}>Au moins une majuscule</Text>
        </View>

        <View style={styles.criteriaRow}>
          <Text
            style={[
              styles.criteriaIcon,
              criteria.lowercase
                ? styles.criteriaValid
                : styles.criteriaInvalid,
            ]}
          >
            {criteria.lowercase ? "✓" : "✗"}
          </Text>
          <Text style={styles.criteriaText}>Au moins une minuscule</Text>
        </View>

        <View style={styles.criteriaRow}>
          <Text
            style={[
              styles.criteriaIcon,
              criteria.number ? styles.criteriaValid : styles.criteriaInvalid,
            ]}
          >
            {criteria.number ? "✓" : "✗"}
          </Text>
          <Text style={styles.criteriaText}>Au moins un chiffre</Text>
        </View>

        <View style={styles.criteriaRow}>
          <Text
            style={[
              styles.criteriaIcon,
              criteria.special ? styles.criteriaValid : styles.criteriaInvalid,
            ]}
          >
            {criteria.special ? "✓" : "✗"}
          </Text>
          <Text style={styles.criteriaText}>Au moins un caractère spécial</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  strengthContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: "rgba(0, 217, 217, 0.05)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 217, 217, 0.2)",
  },
  strengthHeader: {
    marginBottom: 12,
  },
  strengthLabel: {
    color: "#fff",
    fontSize: 13,
  },
  strengthValue: {
    fontWeight: "bold",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  criteriaContainer: {
    gap: 8,
  },
  criteriaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  criteriaIcon: {
    fontSize: 14,
    fontWeight: "bold",
    width: 20,
    marginRight: 8,
  },
  criteriaValid: {
    color: "#00D9D9",
  },
  criteriaInvalid: {
    color: "#666",
  },
  criteriaText: {
    color: "#fff",
    fontSize: 12,
  },
});

export default PasswordStrengthIndicator;
