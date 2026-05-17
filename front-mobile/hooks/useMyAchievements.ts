import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getMyAchievements } from "@/services/achievementsService";
import { UserAchievementWithDetails } from "@/types/achievement";

export interface UseMyAchievementsResult {
  achievements: UserAchievementWithDetails[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMyAchievements(): UseMyAchievementsResult {
  const [achievements, setAchievements] = useState<
    UserAchievementWithDetails[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const data = await getMyAchievements();
      if (isMountedRef.current && requestIdRef.current === requestId) {
        setAchievements(data);
      }
    } catch (err) {
      if (isMountedRef.current && requestIdRef.current === requestId) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      if (isMountedRef.current && requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { achievements, isLoading, error, refresh };
}
