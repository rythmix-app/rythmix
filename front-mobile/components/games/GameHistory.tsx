import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { getMyGameHistory } from "@/services/gameSessionService";
import { GameSession } from "@/types/gameSession";
import { useAuthStore } from "@/stores/authStore";

const PREVIEW_LIMIT = 5;

interface GameHistoryProps {
  gameId: number | null;
  gameTitle: string;
}

export default function GameHistory({
  gameId,
  gameTitle,
}: Readonly<GameHistoryProps>) {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const currentUserId = useAuthStore((state) => state.user?.id);

  useFocusEffect(
    useCallback(() => {
      if (!gameId) return;
      let cancelled = false;
      setLoading(true);
      setError(false);
      getMyGameHistory(gameId, { limit: PREVIEW_LIMIT, page: 1 })
        .then((res) => {
          if (cancelled) return;
          setSessions(res.data);
          setTotal(res.meta.total);
        })
        .catch(() => {
          if (!cancelled) setError(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [gameId]),
  );

  const handleSeeMore = () => {
    if (!gameId) return;
    router.push({
      pathname: "/games/history/[gameId]" as any,
      params: { gameId: gameId.toString(), title: gameTitle },
    });
  };

  if (!gameId) return null;

  if (loading) {
    return (
      <View style={styles.section}>
        <HistoryHeader />
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary.survol} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.section}>
        <HistoryHeader />
        <ThemedText style={styles.emptyText}>
          Impossible de charger l&apos;historique.
        </ThemedText>
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={styles.section}>
        <HistoryHeader />
        <View style={styles.emptyCard}>
          <MaterialIcons
            name="sports-esports"
            size={28}
            color={Colors.game.textMuted}
          />
          <ThemedText style={styles.emptyText}>
            Aucune partie terminée pour le moment.
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <HistoryHeader />
      <View style={styles.list}>
        {sessions.map((session) => (
          <HistoryRow
            key={session.id}
            session={session}
            currentUserId={currentUserId}
          />
        ))}
      </View>
      {total > sessions.length && (
        <TouchableOpacity
          style={styles.seeMoreButton}
          onPress={handleSeeMore}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.seeMoreText}>
            Voir plus ({total})
          </ThemedText>
          <MaterialIcons
            name="chevron-right"
            size={18}
            color={Colors.primary.survol}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

function HistoryHeader() {
  return (
    <View style={styles.sectionHeader}>
      <MaterialIcons name="history" size={24} color={Colors.primary.survol} />
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Historique
      </ThemedText>
    </View>
  );
}

interface HistoryRowProps {
  session: GameSession;
  currentUserId?: string;
}

export function HistoryRow({
  session,
  currentUserId,
}: Readonly<HistoryRowProps>) {
  const playerEntry = currentUserId
    ? session.players?.find((p) => p.userId === currentUserId)
    : undefined;
  const score = playerEntry?.score;
  const expGained = playerEntry?.expGained;
  const rank = playerEntry?.rank;
  const playerCount = session.players?.length ?? 0;
  const isMultiplayer = playerCount > 1;
  const isCompleted = session.status === "completed";
  const rankMedal = isMultiplayer ? getRankMedal(rank) : null;

  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: isCompleted
                ? Colors.game.success
                : Colors.game.error,
            },
          ]}
        />
        <View style={styles.rowTextCol}>
          <ThemedText style={styles.rowDate}>
            {formatSessionDate(session.createdAt)}
          </ThemedText>
          <ThemedText
            style={[
              styles.rowStatus,
              {
                color: isCompleted ? Colors.game.success : Colors.game.error,
              },
            ]}
          >
            {isCompleted ? "Terminée" : "Abandonnée"}
          </ThemedText>
        </View>
      </View>
      <View style={styles.rowRight}>
        {rankMedal && (
          <View style={[styles.pill, styles.rankPill]}>
            <MaterialIcons
              name="emoji-events"
              size={12}
              color={rankMedal.color}
            />
            <ThemedText style={[styles.rankText, { color: rankMedal.color }]}>
              {rankMedal.label}
            </ThemedText>
          </View>
        )}
        <View style={[styles.pill, styles.expPill]}>
          <ThemedText style={styles.expText}>+{expGained ?? 0} XP</ThemedText>
        </View>
        {typeof score === "number" && (
          <View style={[styles.pill, styles.scorePill]}>
            <ThemedText style={styles.scoreText}>{score} pts</ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

function getRankMedal(
  rank: number | undefined,
): { label: string; color: string } | null {
  if (typeof rank !== "number" || rank < 1) return null;
  if (rank === 1) return { label: "1er", color: "#FFD54A" };
  if (rank === 2) return { label: "2e", color: "#C5C5C5" };
  if (rank === 3) return { label: "3e", color: "#D98E4A" };
  return { label: `${rank}e`, color: Colors.game.textMuted };
}

function formatSessionDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    color: "white",
    fontSize: 20,
  },
  list: {
    gap: 10,
  },
  row: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowTextCol: {
    flex: 1,
  },
  rowDate: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  rowStatus: {
    color: Colors.game.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  pill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rankPill: {
    backgroundColor: "rgba(255, 213, 74, 0.12)",
  },
  rankText: {
    fontSize: 12,
    fontWeight: "700",
  },
  expPill: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  expText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  scorePill: {
    backgroundColor: "rgba(20, 255, 236, 0.12)",
  },
  scoreText: {
    color: Colors.primary.survol,
    fontSize: 13,
    fontWeight: "700",
  },
  seeMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 12,
    paddingVertical: 8,
  },
  seeMoreText: {
    color: Colors.primary.survol,
    fontSize: 14,
    fontWeight: "600",
  },
  loadingState: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    color: Colors.game.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
});
