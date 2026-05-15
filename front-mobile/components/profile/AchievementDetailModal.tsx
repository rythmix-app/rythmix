import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { UserAchievementWithDetails } from "@/types/achievement";
import { formatRelativeDate } from "@/utils/relative-date";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const ANIMATION_DURATION = 400;
const TIMING = {
  duration: ANIMATION_DURATION,
  easing: Easing.out(Easing.cubic),
};

interface AchievementDetailModalProps {
  visible: boolean;
  achievement: UserAchievementWithDetails | null;
  onClose: () => void;
}

export default function AchievementDetailModal({
  visible,
  achievement,
  onClose,
}: AchievementDetailModalProps) {
  const insets = useSafeAreaInsets();
  const [isRendered, setIsRendered] = useState(visible);
  const [lastAchievement, setLastAchievement] =
    useState<UserAchievementWithDetails | null>(achievement);
  const hasOpened = useRef(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (achievement) setLastAchievement(achievement);
  }, [achievement]);

  useEffect(() => {
    if (visible) {
      hasOpened.current = true;
      setIsRendered(true);
      progress.value = withTiming(1, TIMING);
    } else if (hasOpened.current) {
      progress.value = withTiming(0, TIMING, (finished) => {
        if (finished) runOnJS(setIsRendered)(false);
      });
    }
  }, [visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * SCREEN_HEIGHT }],
  }));

  if (!isRendered || !lastAchievement) return null;

  const isUnlocked = lastAchievement.unlockedAt !== null;
  const progressRatio =
    lastAchievement.requiredProgress > 0
      ? Math.min(
          1,
          Math.max(
            0,
            lastAchievement.currentProgress / lastAchievement.requiredProgress,
          ),
        )
      : 0;

  return (
    <Modal
      animationType="none"
      transparent
      visible={isRendered}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fermer la modal"
            testID="achievement-modal-backdrop"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: 24 + insets.bottom },
            sheetStyle,
          ]}
        >
          <View style={styles.handle} />

          <Text style={styles.icon}>
            {isUnlocked ? (lastAchievement.icon ?? "🏅") : "🔒"}
          </Text>
          <Text style={styles.name}>{lastAchievement.name}</Text>
          {lastAchievement.description ? (
            <Text style={styles.description}>
              {lastAchievement.description}
            </Text>
          ) : null}

          {isUnlocked ? (
            <Text style={styles.statusUnlocked}>
              Débloqué {formatRelativeDate(lastAchievement.unlockedAt!)}
            </Text>
          ) : (
            <View style={styles.lockedBlock}>
              <Text style={styles.statusLocked}>
                Verrouillé — {lastAchievement.currentProgress}/
                {lastAchievement.requiredProgress}
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressRatio * 100}%` },
                  ]}
                />
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={styles.closeButtonText}>Fermer</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    width: "100%",
    backgroundColor: Colors.primary.fondPremier,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 12,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.icon,
    marginBottom: 20,
    opacity: 0.4,
  },
  icon: {
    fontSize: 60,
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: Colors.dark.icon,
    textAlign: "center",
    marginBottom: 16,
  },
  statusUnlocked: {
    fontSize: 14,
    color: Colors.primary.survol,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  lockedBlock: {
    width: "100%",
    marginBottom: 20,
    alignItems: "center",
    gap: 8,
  },
  statusLocked: {
    fontSize: 14,
    color: Colors.game.textMuted,
    textAlign: "center",
  },
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2A2A2A",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary.CTA,
  },
  closeButton: {
    width: "100%",
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary.CTA,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: "700",
  },
});
