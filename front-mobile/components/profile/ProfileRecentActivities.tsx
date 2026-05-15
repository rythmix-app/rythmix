import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/Colors";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMyActivities } from "@/hooks/useMyActivities";
import { UserActivity } from "@/types/userActivity";
import { formatRelativeDate } from "@/utils/relative-date";

const ACTIVITY_LIMIT = 5;
const SKELETON_COUNT = 3;

function activityBaseKey(activity: UserActivity): string {
  if (activity.type === "game_session") {
    return `game_session-${activity.date}-${activity.gameTitle}-${activity.score}-${activity.maxScore}`;
  }
  return `liked_track-${activity.date}-${activity.trackTitle ?? "unknown"}-${activity.artist ?? "unknown"}`;
}

function getActivityContent(activity: UserActivity): {
  name: string;
  detail: string;
} {
  if (activity.type === "game_session") {
    return {
      name: `Partie ${activity.gameTitle}`,
      detail: `Score : ${activity.score}/${activity.maxScore}`,
    };
  }
  return {
    name: "Titre mis en favori",
    detail: [activity.trackTitle, activity.artist].filter(Boolean).join(" - "),
  };
}

function ActivitySkeletons() {
  return (
    <>
      {Array.from({ length: SKELETON_COUNT }).map((_, idx) => (
        <View key={`skeleton-${idx}`} style={styles.activityItem}>
          <View style={styles.activityDot} />
          <View style={styles.activityContent}>
            <Skeleton width="60%" height={14} style={styles.skeletonLine} />
            <Skeleton width="40%" height={12} />
          </View>
        </View>
      ))}
    </>
  );
}

function ActivityRow({ activity }: { activity: UserActivity }) {
  const { name, detail } = getActivityContent(activity);
  return (
    <View style={styles.activityItem}>
      <View style={styles.activityDot} />
      <View style={styles.activityContent}>
        <Text style={styles.activityName}>{name}</Text>
        <Text style={styles.activityDetail}>{detail}</Text>
      </View>
      <Text style={styles.activityDate}>
        {formatRelativeDate(activity.date)}
      </Text>
    </View>
  );
}

function renderBody(
  isLoading: boolean,
  error: string | null,
  activities: UserActivity[],
) {
  if (isLoading) return <ActivitySkeletons />;
  if (error) {
    return (
      <Text style={styles.feedbackText}>
        Impossible de charger tes activités, réessaie plus tard.
      </Text>
    );
  }
  if (activities.length === 0) {
    return (
      <Text style={styles.feedbackText}>
        Tu n&apos;as pas encore d&apos;activité, lance une partie ou like un
        titre pour commencer&nbsp;!
      </Text>
    );
  }
  const keyCounters = new Map<string, number>();
  return activities.map((activity) => {
    const baseKey = activityBaseKey(activity);
    const duplicateCount = keyCounters.get(baseKey) ?? 0;
    keyCounters.set(baseKey, duplicateCount + 1);

    return (
      <ActivityRow key={`${baseKey}-${duplicateCount}`} activity={activity} />
    );
  });
}

export function ProfileRecentActivities() {
  const { activities, isLoading, error } = useMyActivities(ACTIVITY_LIMIT);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Activités récentes</Text>
      {renderBody(isLoading, error, activities)}
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
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
    gap: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary.CTA,
    flexShrink: 0,
  },
  activityContent: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: "600",
    marginBottom: 2,
  },
  activityDetail: {
    fontSize: 12,
    color: Colors.dark.icon,
  },
  activityDate: {
    fontSize: 11,
    color: Colors.game.textMuted,
    flexShrink: 0,
  },
  feedbackText: {
    fontSize: 13,
    color: Colors.dark.icon,
    fontStyle: "italic",
    paddingVertical: 8,
  },
  skeletonLine: {
    marginBottom: 4,
  },
});
