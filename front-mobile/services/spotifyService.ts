import { del, get, post } from "./api";
import {
  SpotifyArtist,
  SpotifyPaged,
  SpotifyRecentlyPlayedItem,
  SpotifyStatus,
  SpotifyTimeRange,
  SpotifyTrack,
} from "@/types/spotify";

export const getSpotifyStatus = (): Promise<SpotifyStatus> =>
  get<SpotifyStatus>("/api/me/spotify/status");

export const disconnectSpotify = (): Promise<void> => del("/api/me/spotify");

interface TopQueryOptions {
  timeRange?: SpotifyTimeRange;
  limit?: number;
}

const buildQuery = (options: {
  [key: string]: string | number | undefined;
}): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

export const getTopTracks = (
  options: TopQueryOptions = {},
): Promise<SpotifyPaged<SpotifyTrack>> =>
  get<SpotifyPaged<SpotifyTrack>>(
    `/api/me/spotify/top-tracks${buildQuery({
      timeRange: options.timeRange,
      limit: options.limit,
    })}`,
  );

export const getTopArtists = (
  options: TopQueryOptions = {},
): Promise<SpotifyPaged<SpotifyArtist>> =>
  get<SpotifyPaged<SpotifyArtist>>(
    `/api/me/spotify/top-artists${buildQuery({
      timeRange: options.timeRange,
      limit: options.limit,
    })}`,
  );

export const getRecentlyPlayed = (
  options: { limit?: number } = {},
): Promise<{ items: SpotifyRecentlyPlayedItem[] }> =>
  get<{ items: SpotifyRecentlyPlayedItem[] }>(
    `/api/me/spotify/recently-played${buildQuery({ limit: options.limit })}`,
  );

export interface SpotifyInitResponse {
  authorizeUrl: string;
}

export const initSpotifyAuth = (
  returnUrl: string,
): Promise<SpotifyInitResponse> =>
  post<SpotifyInitResponse>("/api/auth/spotify/init", { returnUrl });
