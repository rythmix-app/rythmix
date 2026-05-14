import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UserSpotifyService } from './user-spotify.service';
import { ApiService } from './api.service';
import {
  SpotifyArtist,
  SpotifyPaginatedResponse,
  SpotifyRecentlyPlayedItem,
  SpotifyTrack,
  UserSpotifyStatus,
} from '../models/user-spotify.model';

describe('UserSpotifyService', () => {
  let service: UserSpotifyService;
  let apiService: jasmine.SpyObj<ApiService>;

  const userId = 'user-1';

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('ApiService', ['get']);

    TestBed.configureTestingModule({
      providers: [
        UserSpotifyService,
        { provide: ApiService, useValue: apiSpy },
      ],
    });

    service = TestBed.inject(UserSpotifyService);
    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getStatus', () => {
    it('should call the correct endpoint and return status', (done) => {
      const status: UserSpotifyStatus = {
        connected: true,
        providerUserId: 'sp_user',
        scopes: 'user-top-read',
        likedPlaylistId: null,
        linkedAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-10T00:00:00.000Z',
        expiresAt: '2026-06-01T00:00:00.000Z',
      };
      apiService.get.and.returnValue(of(status));

      service.getStatus(userId).subscribe({
        next: (result) => {
          expect(apiService.get).toHaveBeenCalledWith(
            `/users/${userId}/spotify/status`,
          );
          expect(result).toEqual(status);
          done();
        },
      });
    });

    it('should propagate API errors', (done) => {
      const error = new Error('Not found');
      apiService.get.and.returnValue(throwError(() => error));

      service.getStatus(userId).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('getTopTracks', () => {
    it('should call the correct endpoint with default empty params', (done) => {
      const response: SpotifyPaginatedResponse<SpotifyTrack> = { items: [] };
      apiService.get.and.returnValue(of(response));

      service.getTopTracks(userId).subscribe({
        next: () => {
          expect(apiService.get).toHaveBeenCalledWith(
            `/users/${userId}/spotify/top-tracks`,
            {},
          );
          done();
        },
      });
    });

    it('should forward timeRange and limit params', (done) => {
      const response: SpotifyPaginatedResponse<SpotifyTrack> = { items: [] };
      apiService.get.and.returnValue(of(response));

      service
        .getTopTracks(userId, { timeRange: 'short_term', limit: 5 })
        .subscribe({
          next: () => {
            expect(apiService.get).toHaveBeenCalledWith(
              `/users/${userId}/spotify/top-tracks`,
              { timeRange: 'short_term', limit: 5 },
            );
            done();
          },
        });
    });
  });

  describe('getTopArtists', () => {
    it('should call the correct endpoint with default empty params', (done) => {
      const response: SpotifyPaginatedResponse<SpotifyArtist> = { items: [] };
      apiService.get.and.returnValue(of(response));

      service.getTopArtists(userId).subscribe({
        next: () => {
          expect(apiService.get).toHaveBeenCalledWith(
            `/users/${userId}/spotify/top-artists`,
            {},
          );
          done();
        },
      });
    });

    it('should forward timeRange and limit params', (done) => {
      const response: SpotifyPaginatedResponse<SpotifyArtist> = { items: [] };
      apiService.get.and.returnValue(of(response));

      service
        .getTopArtists(userId, { timeRange: 'long_term', limit: 20 })
        .subscribe({
          next: () => {
            expect(apiService.get).toHaveBeenCalledWith(
              `/users/${userId}/spotify/top-artists`,
              { timeRange: 'long_term', limit: 20 },
            );
            done();
          },
        });
    });
  });

  describe('getRecentlyPlayed', () => {
    it('should call the correct endpoint with default empty params', (done) => {
      const response: SpotifyPaginatedResponse<SpotifyRecentlyPlayedItem> = {
        items: [],
      };
      apiService.get.and.returnValue(of(response));

      service.getRecentlyPlayed(userId).subscribe({
        next: () => {
          expect(apiService.get).toHaveBeenCalledWith(
            `/users/${userId}/spotify/recently-played`,
            {},
          );
          done();
        },
      });
    });

    it('should forward the limit param', (done) => {
      const response: SpotifyPaginatedResponse<SpotifyRecentlyPlayedItem> = {
        items: [],
      };
      apiService.get.and.returnValue(of(response));

      service.getRecentlyPlayed(userId, { limit: 15 }).subscribe({
        next: () => {
          expect(apiService.get).toHaveBeenCalledWith(
            `/users/${userId}/spotify/recently-played`,
            { limit: 15 },
          );
          done();
        },
      });
    });

    it('should propagate API errors', (done) => {
      const error = new Error('Unauthorized');
      apiService.get.and.returnValue(throwError(() => error));

      service.getRecentlyPlayed(userId).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });
});
