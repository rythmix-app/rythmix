import React from "react";
import { Text, StyleSheet, Pressable, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Colors } from "@/constants/Colors";
import { useAuthStore } from "@/stores/authStore";

export default function HomeScreen() {
  const { user } = useAuthStore();

  const handleNavigate = () => {
    router.push("/swipemix");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {user && (
          <Text style={styles.welcomeText}>Bienvenue {user.username}</Text>
        )}

        <Pressable style={styles.btnSwipeMix} onPress={handleNavigate}>
          <Image
            source={require("../../assets/images/home_swipemix.png")}
            style={styles.image}
            resizeMode="cover"
          />
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
    flexDirection: "column",
    justifyContent: "center",
    width: "100%",
  },

  btnSwipeMix: {
    height: 350,
    flexDirection: "column",
    alignItems: "center",
  },
  image: {
    objectFit: "contain",
    width: 300,
    height: "100%",
  },
  welcomeText: {
    fontSize: 50,
    fontFamily: "Bold",
    marginBottom: 20,
    textAlign: "center",
    color: Colors.dark.text,
  },
});
