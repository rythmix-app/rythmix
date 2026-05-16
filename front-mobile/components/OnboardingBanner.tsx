import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";

export default function OnboardingBanner() {
  const { status } = useOnboardingStatus();

  if (!status || status.completed) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Compléter l'onboarding"
      onPress={() => router.push("/onboarding/artists")}
      style={styles.banner}
    >
      <MaterialIcons
        name="auto-awesome"
        size={20}
        color={Colors.primary.survol}
      />
      <View style={styles.textContainer}>
        <Text style={styles.title}>Personnalise ton feed</Text>
        <Text style={styles.subtitle}>
          Choisis 3 à 5 artistes favoris pour un SwipeMix taillé pour toi
        </Text>
      </View>
      <MaterialIcons
        name="chevron-right"
        size={22}
        color={Colors.primary.survol}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary.CTADark,
    borderWidth: 1,
    borderColor: Colors.primary.CTA,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    marginTop: 12,
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: Colors.primary.survol,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  subtitle: {
    color: Colors.dark.text,
    fontSize: 12,
  },
});
