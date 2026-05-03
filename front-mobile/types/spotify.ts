export type SpotifyTimeRange = "short_term" | "medium_term" | "long_term";

export interface SpotifyStatus {
  connected: boolean;
  providerUserId: string | null;
  scopes: string | null;
  likedPlaylistId?: string | null;
}

export interface SpotifyPlaylistSyncResult {
  added: number;
  notOnSpotify: number;
  skipped: number;
}

export interface SpotifyImage {
  url: string;
  width: number | null;
  height: number | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images?: SpotifyImage[];
  genres?: string[];
  popularity?: number;
  external_urls?: { spotify?: string };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images?: SpotifyImage[];
  release_date?: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  explicit?: boolean;
  popularity?: number;
  preview_url?: string | null;
  album?: SpotifyAlbum;
  artists: { id: string; name: string }[];
  external_urls?: { spotify?: string };
}

export interface SpotifyPaged<T> {
  items: T[];
  total?: number;
  limit?: number;
  next?: string | null;
}

export interface SpotifyRecentlyPlayedItem {
  played_at: string;
  track: SpotifyTrack;
}
