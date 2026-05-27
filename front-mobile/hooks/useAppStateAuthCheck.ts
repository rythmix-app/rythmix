import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuthStore } from "@/stores/authStore";

/**
 * Re-valide le token au retour de l'app en foreground.
 * Évite l'état "zombie" où l'app reste connectée après expiration du token.
 */
export const useAppStateAuthCheck = () => {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      const wasBackgrounded =
        previousState === "background" || previousState === "inactive";

      if (
        wasBackgrounded &&
        nextState === "active" &&
        useAuthStore.getState().isAuthenticated
      ) {
        checkAuth();
      }
    });

    return () => subscription.remove();
  }, [checkAuth]);
};
