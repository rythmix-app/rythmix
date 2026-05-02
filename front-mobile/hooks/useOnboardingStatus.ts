import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useAuthStore } from "@/stores/authStore";
import { getMyOnboardingStatus } from "@/services/onboardingService";
import { OnboardingStatus } from "@/types/onboarding";

type CacheState = {
  status: OnboardingStatus | null;
  loading: boolean;
};

let cache: CacheState = { status: null, loading: false };
let inFlight: Promise<OnboardingStatus> | null = null;
const listeners = new Set<() => void>();

function emit() {
  cache = { ...cache };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return cache;
}

async function fetchStatus(): Promise<OnboardingStatus> {
  if (inFlight) return inFlight;

  cache.loading = true;
  emit();

  inFlight = getMyOnboardingStatus()
    .then((status) => {
      cache.status = status;
      return status;
    })
    .finally(() => {
      cache.loading = false;
      inFlight = null;
      emit();
    });

  return inFlight;
}

export function invalidateOnboardingStatus() {
  cache.status = null;
  emit();
}

export function setOnboardingStatusFromResponse(status: OnboardingStatus) {
  if (
    cache.status?.completed === status.completed &&
    cache.status?.artistsCount === status.artistsCount
  ) {
    return;
  }
  cache.status = status;
  emit();
}

export function useOnboardingStatus() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [error, setError] = useState<Error | null>(null);
  const lastAuthRef = useRef(isAuthenticated);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setError(null);
      await fetchStatus();
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to load onboarding status"),
      );
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      cache.status = null;
      cache.loading = false;
      emit();
      return;
    }

    const justLoggedIn = !lastAuthRef.current && isAuthenticated;
    lastAuthRef.current = isAuthenticated;

    if (cache.status === null && !cache.loading) {
      void refresh();
    } else if (justLoggedIn) {
      void refresh();
    }
  }, [isAuthenticated, refresh]);

  return {
    status: state.status,
    loading: state.loading,
    error,
    refresh,
  };
}
