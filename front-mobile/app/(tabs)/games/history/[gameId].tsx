import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import Header from "@/components/Header";
import { ThemedText } from "@/components/ThemedText";
import { HistoryRow } from "@/components/games/GameHistory";
import { Colors } from "@/constants/Colors";
import { getMyGameHistory } from "@/services/gameSessionService";
import { GameSession } from "@/types/gameSession";
import { useAuthStore } from "@/stores/authStore";

const PAGE_SIZE = 20;

export default function GameHistoryScreen() {
  const { gameId: gameIdParam, title } = useLocalSearchParams<{
    gameId: string;
    title?: string;
  }>();
  const gameId = Number(gameIdParam);
  const headerTitle = title ? `Historique — ${title}` : "Historique";
  const currentUserId = useAuthStore((state) => state.user?.id);

  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const loadPage = useCallback(
    async (targetPage: number) => {
      if (!gameId) return;
      if (targetPage === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await getMyGameHistory(gameId, {
          page: targetPage,
          limit: PAGE_SIZE,
        });
        setSessions((prev) =>
          targetPage === 1 ? res.data : [...prev, ...res.data],
        );
        setPage(res.meta.currentPage);
        setLastPage(res.meta.lastPage);
        setError(false);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [gameId],
  );

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const handleEndReached = () => {
    if (loadingMore || loading) return;
    if (page >= lastPage) return;
    loadPage(page + 1);
  };

  if (loading) {
    return (
      <>
        <Header title={headerTitle} variant="withBack" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary.survol} />
        </View>
      </>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <>
        <Header title={headerTitle} variant="withBack" />
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={60} color="#ff6b6b" />
          <ThemedText style={styles.errorText}>
            Impossible de charger l&apos;historique.
          </ThemedText>
        </View>
      </>
    );
  }

  if (sessions.length === 0) {
    return (
      <>
        <Header title={headerTitle} variant="withBack" />
        <View style={styles.centerContainer}>
          <MaterialIcons
            name="sports-esports"
            size={60}
            color={Colors.game.textMuted}
          />
          <ThemedText style={styles.emptyText}>
            Aucune partie terminée pour le moment.
          </ThemedText>
        </View>
      </>
    );
  }

  return (
    <>
      <Header title={headerTitle} variant="withBack" />
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HistoryRow session={item} currentUserId={currentUserId} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              color={Colors.primary.survol}
              style={styles.footerLoader}
            />
          ) : null
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  separator: {
    height: 10,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 12,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 15,
    textAlign: "center",
  },
  emptyText: {
    color: Colors.game.textMuted,
    fontSize: 15,
    textAlign: "center",
  },
  footerLoader: {
    paddingVertical: 16,
  },
});
