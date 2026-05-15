import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/Colors";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMyAchievements } from "@/hooks/useMyAchievements";
import { UserAchievementWithDetails } from "@/types/achievement";
import AchievementDetailModal from "@/components/profile/AchievementDetailModal";

const SKELETON_COUNT = 9;

function AchievementSkeletons() {
  return (
    <>
      {Array.from({ length: SKELETON_COUNT }).map((_, idx) => (
        <Skeleton
          key={`achievement-skeleton-${idx}`}
          width="31%"
          height={80}
          borderRadius={12}
          style={styles.skeletonCard}
        />
      ))}
    </>
  );
}

function AchievementCard({
  achievement,
  onPress,
}: {
  achievement: UserAchievementWithDetails;
  onPress: (a: UserAchievementWithDetails) => void;
}) {
  const isUnlocked = achievement.unlockedAt !== null;
  return (
    <Pressable
      style={[styles.card, !isUnlocked && styles.cardLocked]}
      onPress={() => onPress(achievement)}
      accessibilityRole="button"
      accessibilityLabel={`${achievement.name}, ${isUnlocked ? "débloqué" : "verrouillé"}`}
    >
      <Text style={styles.icon}>
        {isUnlocked ? (achievement.icon ?? "🏅") : "🔒"}
      </Text>
      <Text style={[styles.name, !isUnlocked && styles.nameLocked]}>
        {achievement.name}
      </Text>
    </Pressable>
  );
}

function renderBody(
  isLoading: boolean,
  error: string | null,
  achievements: UserAchievementWithDetails[],
  onPress: (a: UserAchievementWithDetails) => void,
) {
  if (isLoading) return <AchievementSkeletons />;
  if (error) {
    return (
      <Text style={styles.feedbackText}>
        Impossible de charger tes succès, réessaie plus tard.
      </Text>
    );
  }
  if (achievements.length === 0) {
    return (
      <Text style={styles.feedbackText}>
        Aucun succès disponible pour le moment.
      </Text>
    );
  }
  return achievements.map((achievement) => (
    <AchievementCard
      key={achievement.id}
      achievement={achievement}
      onPress={onPress}
    />
  ));
}

export default function ProfileAchievementsSection() {
  const { achievements, isLoading, error } = useMyAchievements();
  const [selected, setSelected] = useState<UserAchievementWithDetails | null>(
    null,
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Succès & Récompenses</Text>
      <View style={styles.grid}>
        {renderBody(isLoading, error, achievements, setSelected)}
      </View>
      <AchievementDetailModal
        visible={selected !== null}
        achievement={selected}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary.CTA,
    paddingLeft: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "31%",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary.CTA,
  },
  cardLocked: {
    borderColor: "#2A2A2A",
    opacity: 0.5,
  },
  icon: {
    fontSize: 28,
  },
  name: {
    fontSize: 11,
    color: Colors.dark.text,
    textAlign: "center",
    fontWeight: "600",
  },
  nameLocked: {
    color: Colors.dark.icon,
  },
  skeletonCard: {
    marginBottom: 0,
  },
  feedbackText: {
    fontSize: 13,
    color: Colors.dark.icon,
    fontStyle: "italic",
    paddingVertical: 8,
    width: "100%",
    textAlign: "center",
  },
});
