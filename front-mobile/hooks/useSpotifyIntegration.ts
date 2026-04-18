import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import {
  disconnectSpotify,
  getSpotifyStatus,
  initSpotifyAuth,
} from "@/services/spotifyService";
import { SpotifyStatus } from "@/types/spotify";

export interface UseSpotifyIntegration {
  status: SpotifyStatus | null;
  isLoading: boolean;
  isConnecting: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  connect: () => Promise<"ok" | "cancelled" | "error">;
  disconnect: () => Promise<void>;
}

export function useSpotifyIntegration(): UseSpotifyIntegration {
  const [status, setStatus] = useState<SpotifyStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const returnUrl = useMemo(() => Linking.createURL("spotify-linked"), []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (isMountedRef.current) setIsLoading(true);
    try {
      const data = await getSpotifyStatus();
      if (isMountedRef.current) {
        setStatus(data);
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setStatus(null);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (url.startsWith(returnUrl)) {
        void refresh();
      }
    });
    return () => subscription.remove();
  }, [refresh, returnUrl]);

  const connect = useCallback(async (): Promise<
    "ok" | "cancelled" | "error"
  > => {
    setIsConnecting(true);
    try {
      const { authorizeUrl } = await initSpotifyAuth(returnUrl);

      const result = await WebBrowser.openAuthSessionAsync(
        authorizeUrl,
        returnUrl,
      );

      if (result.type === "success") {
        const parsed = Linking.parse(result.url);
        const status = parsed.queryParams?.status;
        if (status === "ok") {
          await refresh();
          return "ok";
        }
        const reason = parsed.queryParams?.reason;
        setError(typeof reason === "string" ? reason : "spotify_error");
        return "error";
      }

      if (result.type === "cancel" || result.type === "dismiss") {
        return "cancelled";
      }

      setError("spotify_error");
      return "error";
    } catch (err) {
      setError(err instanceof Error ? err.message : "spotify_error");
      return "error";
    } finally {
      if (isMountedRef.current) setIsConnecting(false);
    }
  }, [refresh, returnUrl]);

  const disconnect = useCallback(async () => {
    try {
      await disconnectSpotify();
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }
    await refresh();
  }, [refresh]);

  return {
    status,
    isLoading,
    isConnecting,
    error,
    refresh,
    connect,
    disconnect,
  };
}
