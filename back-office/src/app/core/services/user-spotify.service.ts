import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  SpotifyArtist,
  SpotifyPaginatedResponse,
  SpotifyRecentlyPlayedItem,
  SpotifyTrack,
  UserSpotifyStatus,
} from '../models/user-spotify.model';

@Injectable({
  providedIn: 'root',
})
export class UserSpotifyService {
  private endpoint = '/users';
  private api = inject(ApiService);

  getStatus(userId: string): Observable<UserSpotifyStatus> {
    return this.api.get<UserSpotifyStatus>(
      `${this.endpoint}/${userId}/spotify/status`,
    );
  }

  getTopTracks(
    userId: string,
    params: { timeRange?: 'short_term' | 'medium_term' | 'long_term'; limit?: number } = {},
  ): Observable<SpotifyPaginatedResponse<SpotifyTrack>> {
    return this.api.get<SpotifyPaginatedResponse<SpotifyTrack>>(
      `${this.endpoint}/${userId}/spotify/top-tracks`,
      params,
    );
  }

  getTopArtists(
    userId: string,
    params: { timeRange?: 'short_term' | 'medium_term' | 'long_term'; limit?: number } = {},
  ): Observable<SpotifyPaginatedResponse<SpotifyArtist>> {
    return this.api.get<SpotifyPaginatedResponse<SpotifyArtist>>(
      `${this.endpoint}/${userId}/spotify/top-artists`,
      params,
    );
  }

  getRecentlyPlayed(
    userId: string,
    params: { limit?: number } = {},
  ): Observable<SpotifyPaginatedResponse<SpotifyRecentlyPlayedItem>> {
    return this.api.get<SpotifyPaginatedResponse<SpotifyRecentlyPlayedItem>>(
      `${this.endpoint}/${userId}/spotify/recently-played`,
      params,
    );
  }
}
