import { useCallback, useEffect, useRef, useState } from "react";
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

  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;

    const requestId = ++requestIdRef.current;
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const data = await userStatsService.getMyStats();
      if (isMountedRef.current && requestIdRef.current === requestId) {
        setStats(data);
      }
    } catch (err: unknown) {
      console.error("[useMyStats] Failed to fetch user stats:", err);
      if (isMountedRef.current && requestIdRef.current === requestId) {
        setError("Erreur lors du chargement des statistiques");
      }
    } finally {
      if (isMountedRef.current && requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        void fetchStats();
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
