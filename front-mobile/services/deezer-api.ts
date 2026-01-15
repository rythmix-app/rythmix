import { cacheManager, DEFAULT_TTL } from "./cache-manager";
import { DeezerAPIError } from "../types/errors";
import { retryWithBackoff, fetchWithTimeout } from "./retry-helper";

export interface DeezerTrack {
  id: number;
  title: string;
  title_short: string;
  title_version: string;
  link: string;
  duration: number;
  rank: number;
  explicit_lyrics: boolean;
  explicit_content_lyrics: number;
  explicit_content_cover: number;
  preview: string;
  md5_image: string;
  artist: {
    id: number;
    name: string;
    link: string;
    picture: string;
    picture_small: string;
    picture_medium: string;
    picture_big: string;
    picture_xl: string;
    tracklist: string;
    type: string;
  };
  album: {
    id: number;
    title: string;
    cover: string;
    cover_small: string;
    cover_medium: string;
    cover_big: string;
    cover_xl: string;
    md5_image: string;
    tracklist: string;
    type: string;
  };
  type: string;
}

export interface DeezerSearchResponse {
  data: DeezerTrack[];
  total: number;
  next?: string;
}

export interface DeezerGenre {
  id: number;
  name: string;
  picture: string;
  picture_small: string;
  picture_medium: string;
  picture_big: string;
  picture_xl: string;
}

export interface DeezerGenresResponse {
  data: DeezerGenre[];
}

export interface DeezerAlbum {
  id: number;
  title: string;
  link: string;
  cover: string;
  cover_small: string;
  cover_medium: string;
  cover_big: string;
  cover_xl: string;
  md5_image: string;
  genre_id: number;
  release_date: string;
  record_type: string;
  tracklist: string;
  explicit_lyrics: boolean;
  nb_tracks: number;
  duration: number;
  fans: number;
  artist: {
    id: number;
    name: string;
    picture: string;
    picture_small: string;
    picture_medium: string;
    picture_big: string;
    picture_xl: string;
  };
  tracks?: {
    data: DeezerTrack[];
  };
  type: string;
}

export interface DeezerAlbumsResponse {
  data: DeezerAlbum[];
  total?: number;
  next?: string;
}

export interface DeezerPlaylist {
  id: number;
  title: string;
  description: string;
  duration: number;
  public: boolean;
  nb_tracks: number;
  fans: number;
  link: string;
  picture: string;
  picture_small: string;
  picture_medium: string;
  picture_big: string;
  picture_xl: string;
  creator: {
    id: number;
    name: string;
  };
  tracks: {
    data: DeezerTrack[];
  };
}

class DeezerAPI {
  private baseUrl =
    process.env.EXPO_PUBLIC_DEEZER_API_URL || "https://api.deezer.com";
  private enableCache = true;
  private readonly REQUEST_TIMEOUT = 10000; // 10 secondes

  /**
   * Effectue une requête avec gestion d'erreurs améliorée, retry et timeout
   */
  private async fetchWithRetry<T>(url: string): Promise<T> {
    return await retryWithBackoff(
      async () => {
        try {
          const response = await fetchWithTimeout(
            url,
            {},
            this.REQUEST_TIMEOUT,
          );

          // Gérer les différents codes d'erreur HTTP
          if (!response.ok) {
            throw DeezerAPIError.fromResponse(
              response.status,
              await this.getErrorMessage(response),
            );
          }

          return await response.json();
        } catch (error) {
          // Si c'est déjà une DeezerAPIError, la relancer
          if (error instanceof DeezerAPIError) {
            throw error;
          }

          // Si c'est une erreur réseau (fetch failed)
          if (error instanceof TypeError && error.message.includes("fetch")) {
            throw DeezerAPIError.network("No internet connection");
          }

          // Erreur inconnue
          throw new DeezerAPIError(
            error instanceof Error ? error.message : "Unknown error",
          );
        }
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        shouldRetry: (error) => {
          if (error instanceof DeezerAPIError) {
            return error.isRetryable();
          }
          return false;
        },
      },
    );
  }

  /**
   * Extrait le message d'erreur de la réponse HTTP
   */
  private async getErrorMessage(
    response: Response,
  ): Promise<string | undefined> {
    try {
      const data = await response.json();
      return data.error?.message || data.message;
    } catch {
      return undefined;
    }
  }

  async searchTracks(
    query: string,
    limit: number = 10,
  ): Promise<DeezerSearchResponse> {
    const cacheKey = `search:${query}:${limit}`;
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=${limit}`;

    if (this.enableCache) {
      return await cacheManager.getOrSet(
        cacheKey,
        () => this.fetchWithRetry<DeezerSearchResponse>(url),
        DEFAULT_TTL.SEARCH,
      );
    }

    return await this.fetchWithRetry<DeezerSearchResponse>(url);
  }

  async getTopTracks(
    limit: number = 10,
    index: number = 0,
  ): Promise<DeezerSearchResponse> {
    const cacheKey = `top_tracks:${limit}:${index}`;
    const url = `${this.baseUrl}/chart/0/tracks?limit=${limit}&index=${index}`;

    if (this.enableCache) {
      return await cacheManager.getOrSet(
        cacheKey,
        () => this.fetchWithRetry<DeezerSearchResponse>(url),
        DEFAULT_TTL.TRACKS,
      );
    }

    return await this.fetchWithRetry<DeezerSearchResponse>(url);
  }

  async getArtistTopTracks(
    artistId: number,
    limit: number = 10,
  ): Promise<DeezerSearchResponse> {
    const cacheKey = `artist_top:${artistId}:${limit}`;
    const url = `${this.baseUrl}/artist/${artistId}/top?limit=${limit}`;

    if (this.enableCache) {
      return await cacheManager.getOrSet(
        cacheKey,
        () => this.fetchWithRetry<DeezerSearchResponse>(url),
        DEFAULT_TTL.TRACKS,
      );
    }

    return await this.fetchWithRetry<DeezerSearchResponse>(url);
  }

  async getTrack(id: number): Promise<DeezerTrack> {
    const cacheKey = `track:${id}`;
    const url = `${this.baseUrl}/track/${id}`;

    if (this.enableCache) {
      return await cacheManager.getOrSet(
        cacheKey,
        () => this.fetchWithRetry<DeezerTrack>(url),
        DEFAULT_TTL.TRACKS,
      );
    }

    return await this.fetchWithRetry<DeezerTrack>(url);
  }

  async getGenres(): Promise<DeezerGenresResponse> {
    const cacheKey = "genres";
    const url = `${this.baseUrl}/genre`;

    if (this.enableCache) {
      return await cacheManager.getOrSet(
        cacheKey,
        () => this.fetchWithRetry<DeezerGenresResponse>(url),
        DEFAULT_TTL.GENRES,
      );
    }

    return await this.fetchWithRetry<DeezerGenresResponse>(url);
  }

  async getGenreTracks(
    genreId: number,
    limit: number = 50,
  ): Promise<DeezerSearchResponse> {
    const cacheKey = `genre_tracks:${genreId}:${limit}`;
    const url = `${this.baseUrl}/chart/${genreId}/tracks?limit=${limit}`;

    if (this.enableCache) {
      return await cacheManager.getOrSet(
        cacheKey,
        () => this.fetchWithRetry<DeezerSearchResponse>(url),
        DEFAULT_TTL.TRACKS,
      );
    }

    return await this.fetchWithRetry<DeezerSearchResponse>(url);
  }

  async getRecommendations(genres?: string[]): Promise<DeezerSearchResponse> {
    const cacheKey = `recommendations:${genres?.join(",") || "default"}`;
    const url =
      genres && genres.length > 0
        ? `${this.baseUrl}/genre/${genres[0]}/artists`
        : `${this.baseUrl}/chart/0/tracks`;

    if (this.enableCache) {
      return await cacheManager.getOrSet(
        cacheKey,
        () => this.fetchWithRetry<DeezerSearchResponse>(url),
        DEFAULT_TTL.TRACKS,
      );
    }

    return await this.fetchWithRetry<DeezerSearchResponse>(url);
  }

  async getPlaylist(playlistId: number): Promise<DeezerPlaylist> {
    const cacheKey = `playlist:${playlistId}`;
    const url = `${this.baseUrl}/playlist/${playlistId}`;

    if (this.enableCache) {
      return await cacheManager.getOrSet(
        cacheKey,
        () => this.fetchWithRetry<DeezerPlaylist>(url),
        DEFAULT_TTL.PLAYLISTS,
      );
    }

    return await this.fetchWithRetry<DeezerPlaylist>(url);
  }

  async getGenreAlbums(
    genreId: number,
    limit: number = 50,
  ): Promise<DeezerAlbumsResponse> {
    const cacheKey = `genre_albums:${genreId}:${limit}`;
    const url = `${this.baseUrl}/chart/${genreId}/albums?limit=${limit}`;

    if (this.enableCache) {
      return await cacheManager.getOrSet(
        cacheKey,
        () => this.fetchWithRetry<DeezerAlbumsResponse>(url),
        DEFAULT_TTL.TRACKS,
      );
    }

    return await this.fetchWithRetry<DeezerAlbumsResponse>(url);
  }

  async getAlbum(albumId: number): Promise<DeezerAlbum> {
    const cacheKey = `album:${albumId}`;
    const url = `${this.baseUrl}/album/${albumId}`;

    if (this.enableCache) {
      return await cacheManager.getOrSet(
        cacheKey,
        () => this.fetchWithRetry<DeezerAlbum>(url),
        DEFAULT_TTL.TRACKS,
      );
    }

    return await this.fetchWithRetry<DeezerAlbum>(url);
  }

  async getAlbumTracks(
    albumId: number,
    limit: number = 50,
  ): Promise<DeezerSearchResponse> {
    const cacheKey = `album_tracks:${albumId}:${limit}`;
    const url = `${this.baseUrl}/album/${albumId}/tracks?limit=${limit}`;

    if (this.enableCache) {
      return await cacheManager.getOrSet(
        cacheKey,
        () => this.fetchWithRetry<DeezerSearchResponse>(url),
        DEFAULT_TTL.TRACKS,
      );
    }

    return await this.fetchWithRetry<DeezerSearchResponse>(url);
  }

  /**
   * Active ou désactive le cache
   */
  setCacheEnabled(enabled: boolean): void {
    this.enableCache = enabled;
  }

  /**
   * Vide tout le cache
   */
  async clearCache(): Promise<void> {
    await cacheManager.clear();
  }
}

export const deezerAPI = new DeezerAPI();
