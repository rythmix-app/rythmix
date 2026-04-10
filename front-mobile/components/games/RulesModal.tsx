import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";

interface RulesStep {
  text: string;
}

interface RulesModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  objective: string;
  steps: RulesStep[];
}

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function RulesModal({
  visible,
  onClose,
  title,
  objective,
  steps,
}: RulesModalProps) {
  const [mounted, setMounted] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const visibleRef = useRef(visible);
  const hasBeenVisibleRef = useRef(false);

  useEffect(() => {
    visibleRef.current = visible;
    animationRef.current?.stop();

    if (visible) {
      hasBeenVisibleRef.current = true;
      overlayOpacity.setValue(0);
      translateY.setValue(SCREEN_HEIGHT);
      setMounted(true);
      animationRef.current = Animated.sequence([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);
      animationRef.current.start();
    } else if (hasBeenVisibleRef.current) {
      animationRef.current = Animated.sequence([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 320,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]);
      animationRef.current.start(({ finished }) => {
        if (finished && !visibleRef.current) setMounted(false);
      });
    }
  }, [visible, overlayOpacity, translateY]);

  useEffect(() => {
    return () => {
      animationRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <Animated.View
      style={[styles.overlay, { opacity: overlayOpacity }]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[styles.modalCard, { transform: [{ translateY }] }]}
      >
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#999" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons
                name="info"
                size={20}
                color={Colors.primary.survol}
              />
              <ThemedText style={styles.sectionTitle}>Objectif</ThemedText>
            </View>
            <ThemedText style={styles.text}>{objective}</ThemedText>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons
                name="sports-esports"
                size={20}
                color={Colors.primary.survol}
              />
              <ThemedText style={styles.sectionTitle}>Comment jouer</ThemedText>
            </View>
            <View style={styles.list}>
              {steps.map((step, index) => (
                <View key={index} style={styles.listItem}>
                  <ThemedText style={styles.listNumber}>
                    {index + 1}.
                  </ThemedText>
                  <ThemedText style={styles.listText}>{step.text}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
    zIndex: 1000,
    elevation: 1000,
  },
  modalCard: {
    backgroundColor: "#121212",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    color: "white",
    fontSize: 20,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.primary.survol,
    fontSize: 16,
    fontWeight: "600",
  },
  text: {
    color: "#CCC",
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    gap: 10,
  },
  listItem: {
    flexDirection: "row",
    gap: 10,
  },
  listNumber: {
    color: Colors.primary.survol,
    fontSize: 15,
    fontWeight: "bold",
    minWidth: 20,
  },
  listText: {
    color: "#CCC",
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
  },
});
