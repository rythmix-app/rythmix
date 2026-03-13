import { Animated, StyleSheet, View } from "react-native";
import { ThemedText } from "./ThemedText";
import React from "react";
import { LinearGradient } from "expo-linear-gradient";

interface GameErrorFeedbackProps {
  children: React.ReactNode;
  shakeAnimation: Animated.Value;
  borderOpacity: Animated.Value;
  errorMessage: string | null;
  animationsEnabled?: boolean;
}

export function GameErrorFeedback({
  children,
  shakeAnimation,
  borderOpacity,
  errorMessage,
  animationsEnabled = true,
}: GameErrorFeedbackProps) {
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          animationsEnabled && { transform: [{ translateX: shakeAnimation }] },
        ]}
      >
        {children}
      </Animated.View>

      {animationsEnabled && (
        <>
          {/* Gradient rouge — bord gauche */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sideGradient,
              styles.leftGradient,
              { opacity: borderOpacity },
            ]}
          >
            <LinearGradient
              colors={["rgba(220, 30, 30, 0.9)", "rgba(220, 30, 30, 0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Gradient rouge — bord droit */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sideGradient,
              styles.rightGradient,
              { opacity: borderOpacity },
            ]}
          >
            <LinearGradient
              colors={["rgba(220, 30, 30, 0)", "rgba(220, 30, 30, 0.9)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </>
      )}

      {errorMessage !== null && (
        <View pointerEvents="none" style={styles.toastOverlay}>
          <View style={styles.errorToast}>
            <ThemedText style={styles.errorToastText}>
              {errorMessage}
            </ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  sideGradient: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 40,
  },
  leftGradient: {
    left: 0,
  },
  rightGradient: {
    right: 0,
  },
  toastOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  errorToast: {
    backgroundColor: "#121212",
    borderWidth: 2,
    borderColor: "rgba(220, 30, 30, 0.9)",
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 24,
    width: 240,
    alignItems: "center",
  },
  errorToastText: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 22,
  },
});
