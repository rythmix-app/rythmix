import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useToast } from "@/components/Toast";
import { useSpotifyIntegration } from "./useSpotifyIntegration";
import {
  InteractionAction,
  SpotifyTriggerSnapshot,
} from "@/types/trackInteraction";

const PROMPT_LAST_SHOWN_KEY = "spotify_connect_prompt_last_shown_day";

const todayKey = (): string => new Date().toISOString().slice(0, 10);

export interface UseSpotifyLikeFeedback {
  connectModalVisible: boolean;
  isConnecting: boolean;
  onConnectFromModal: () => Promise<void>;
  onDismissModal: () => void;
  onLikeAttempted: (action: InteractionAction) => Promise<void>;
  onInteractionResult: (result: SpotifyTriggerSnapshot | undefined) => void;
}

export function useSpotifyLikeFeedback(): UseSpotifyLikeFeedback {
  const toast = useToast();
  const { status, isLoading, connect, isConnecting, refresh } =
    useSpotifyIntegration();
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onLikeAttempted = useCallback(
    async (action: InteractionAction) => {
      if (action !== "liked") return;
      if (isLoading) return;
      if (status?.connected) return;

      const lastShown = await AsyncStorage.getItem(PROMPT_LAST_SHOWN_KEY);
      if (lastShown === todayKey()) return;

      await AsyncStorage.setItem(PROMPT_LAST_SHOWN_KEY, todayKey());
      if (isMountedRef.current) setConnectModalVisible(true);
    },
    [isLoading, status?.connected],
  );

  const onConnectFromModal = useCallback(async () => {
    const result = await connect();
    if (result === "ok") {
      if (isMountedRef.current) setConnectModalVisible(false);
      toast.show({
        type: "success",
        message: "Spotify connecté — tes likes seront sauvegardés.",
      });
    } else if (result === "error") {
      toast.show({ type: "error", message: "Connexion Spotify échouée." });
    }
  }, [connect, toast]);

  const onDismissModal = useCallback(() => {
    setConnectModalVisible(false);
  }, []);

  const onInteractionResult = useCallback(
    (result: SpotifyTriggerSnapshot | undefined) => {
      if (!result) return;

      if (result.scopeUpgradeRequired) {
        toast.show({
          type: "warning",
          message:
            "Permission Spotify manquante — reconnecte-toi pour activer la playlist.",
        });
        void refresh();
        return;
      }

      if (result.notOnSpotify) {
        toast.show({
          type: "warning",
          message: "Cette track n'est pas disponible sur Spotify.",
        });
      }
    },
    [refresh, toast],
  );

  return {
    connectModalVisible,
    isConnecting,
    onConnectFromModal,
    onDismissModal,
    onLikeAttempted,
    onInteractionResult,
  };
}
