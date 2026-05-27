import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getMyActivities } from "@/services/userActivitiesService";
import { UserActivity } from "@/types/userActivity";

export interface UseMyActivitiesResult {
  activities: UserActivity[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMyActivities(limit: number = 5): UseMyActivitiesResult {
  const [activities, setActivities] = useState<UserActivity[]>([]);
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
      const data = await getMyActivities(limit);
      if (isMountedRef.current && requestIdRef.current === requestId) {
        setActivities(data);
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
  }, [limit]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { activities, isLoading, error, refresh };
}
