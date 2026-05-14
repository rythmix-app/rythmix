export interface SpotifyImage {
  url: string;
  height?: number | null;
  width?: number | null;
}

export interface SpotifyArtistRef {
  id: string;
  name: string;
}

export interface SpotifyAlbumRef {
  id: string;
  name: string;
  images?: SpotifyImage[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtistRef[];
  album?: SpotifyAlbumRef;
  preview_url?: string | null;
  external_urls?: { spotify?: string };
  duration_ms?: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres?: string[];
  images?: SpotifyImage[];
  external_urls?: { spotify?: string };
  followers?: { total?: number };
}

export interface SpotifyPaginatedResponse<T> {
  items: T[];
  total?: number;
  limit?: number;
  next?: string | null;
}

export interface SpotifyRecentlyPlayedItem {
  track: SpotifyTrack;
  played_at: string;
}

export interface UserSpotifyStatus {
  connected: boolean;
  providerUserId: string | null;
  scopes: string | null;
  likedPlaylistId: string | null;
  linkedAt: string | null;
  updatedAt: string | null;
  expiresAt: string | null;
}
