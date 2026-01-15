import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Colors } from "@/constants/Colors";

export default function HomeScreen() {
  const handleNavigate = () => {
    router.push("/"); // adapte la route si besoin
  };

  return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={handleNavigate}
          >
            <Image
                source={{
                  uri: "https://picsum.photos/600/800", // image temporaire
                }}
                style={styles.image}
                resizeMode="cover"
            />

            <View style={styles.overlay}>
              <Text style={styles.title}>Découvrez de nouveaux sons</Text>

              <View style={styles.cta}>
                <Text style={styles.ctaText}>Swiper maintenant</Text>
              </View>
            </View>
          </Pressable>
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  card: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#111",
    elevation: 4,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },

  image: {
    width: "100%",
    height: 420,
  },

  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  title: {
    color: Colors.light.background,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },

  cta: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primary.CTA,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ctaText: {
    color: Colors.primary.fondPremier,
    fontWeight: "700",
    fontSize: 14,
  },
});
