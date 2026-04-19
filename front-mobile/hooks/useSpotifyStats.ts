import { useCallback, useEffect, useRef, useState } from "react";
import {
  getRecentlyPlayed,
  getTopArtists,
  getTopTracks,
} from "@/services/spotifyService";
import {
  SpotifyArtist,
  SpotifyRecentlyPlayedItem,
  SpotifyTimeRange,
  SpotifyTrack,
} from "@/types/spotify";

export type SpotifyStatsType = "topTracks" | "topArtists" | "recentlyPlayed";

export interface UseSpotifyStatsOptions {
  type: SpotifyStatsType;
  timeRange?: SpotifyTimeRange;
  limit?: number;
  enabled?: boolean;
}

export interface UseSpotifyStatsResult {
  tracks: SpotifyTrack[];
  artists: SpotifyArtist[];
  recentlyPlayed: SpotifyRecentlyPlayedItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSpotifyStats({
  type,
  timeRange = "medium_term",
  limit = 20,
  enabled = true,
}: UseSpotifyStatsOptions): UseSpotifyStatsResult {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<
    SpotifyRecentlyPlayedItem[]
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
    if (!enabled) return;

    const requestId = ++requestIdRef.current;
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      if (type === "topTracks") {
        const data = await getTopTracks({ timeRange, limit });
        if (isMountedRef.current && requestIdRef.current === requestId) {
          setTracks(data.items ?? []);
        }
      } else if (type === "topArtists") {
        const data = await getTopArtists({ timeRange, limit });
        if (isMountedRef.current && requestIdRef.current === requestId) {
          setArtists(data.items ?? []);
        }
      } else {
        const data = await getRecentlyPlayed({ limit });
        if (isMountedRef.current && requestIdRef.current === requestId) {
          setRecentlyPlayed(data.items ?? []);
        }
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
  }, [enabled, type, timeRange, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { tracks, artists, recentlyPlayed, isLoading, error, refresh };
}
