import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { userStatsService, UserStats } from "@/services/userStatsService";
import { useAuthStore } from "@/stores/authStore";

/**
 * Hook to manage user statistics fetching and state
 */
export function useMyStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      console.log("[useMyStats] Fetching stats...");
      setLoading(true);
      setError(null);
      const data = await userStatsService.getMyStats();
      console.log("[useMyStats] Stats received:", data);
      setStats(data);
    } catch (err: any) {
      console.error("[useMyStats] Failed to fetch user stats:", err);
      setError("Erreur lors du chargement des statistiques");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        fetchStats();
      }
    }, [fetchStats, isAuthenticated]),
  );

  return {
    stats,
    loading: isAuthenticated ? loading : false,
    error,
    retry: fetchStats,
  };
}
