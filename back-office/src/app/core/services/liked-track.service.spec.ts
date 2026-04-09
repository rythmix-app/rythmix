import { TestBed } from '@angular/core/testing';
import { LikedTrackService } from './liked-track.service';
import { ApiService } from './api.service';
import { of, throwError } from 'rxjs';
import { LikedTrack } from '../models/liked-track.model';

describe('LikedTrackService', () => {
  let service: LikedTrackService;
  let apiService: jasmine.SpyObj<ApiService>;

  const mockTracks: LikedTrack[] = [
    {
      id: 1,
      userId: 'user-1',
      deezerTrackId: '111',
      title: 'Track A',
      artist: 'Artist A',
      type: 'track',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      userId: 'user-2',
      deezerTrackId: '222',
      title: 'Track B',
      artist: 'Artist B',
      type: 'track',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      userId: 'user-1',
      deezerTrackId: '333',
      title: 'Track C',
      artist: 'Artist C',
      type: 'track',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('ApiService', ['get', 'delete']);

    TestBed.configureTestingModule({
      providers: [LikedTrackService, { provide: ApiService, useValue: apiSpy }],
    });

    service = TestBed.inject(LikedTrackService);
    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getByUserId', () => {
    it('should return only tracks belonging to the given user', (done) => {
      apiService.get.and.returnValue(of({ likedTracks: mockTracks }));

      service.getByUserId('user-1').subscribe({
        next: (tracks) => {
          expect(tracks.length).toBe(2);
          expect(tracks.every((t) => t.userId === 'user-1')).toBe(true);
          done();
        },
      });
    });

    it('should return empty array when user has no tracks', (done) => {
      apiService.get.and.returnValue(of({ likedTracks: mockTracks }));

      service.getByUserId('user-999').subscribe({
        next: (tracks) => {
          expect(tracks.length).toBe(0);
          done();
        },
      });
    });

    it('should return empty array when likedTracks list is empty', (done) => {
      apiService.get.and.returnValue(of({ likedTracks: [] }));

      service.getByUserId('user-1').subscribe({
        next: (tracks) => {
          expect(tracks).toEqual([]);
          done();
        },
      });
    });

    it('should call the correct API endpoint', (done) => {
      apiService.get.and.returnValue(of({ likedTracks: [] }));

      service.getByUserId('user-1').subscribe({
        next: () => {
          expect(apiService.get).toHaveBeenCalledWith('/liked-tracks');
          done();
        },
      });
    });

    it('should propagate API errors', (done) => {
      const error = new Error('Network error');
      apiService.get.and.returnValue(throwError(() => error));

      service.getByUserId('user-1').subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('deleteLikedTrack', () => {
    it('should call the correct API endpoint', (done) => {
      apiService.delete.and.returnValue(of(undefined));

      service.deleteLikedTrack(42).subscribe({
        next: () => {
          expect(apiService.delete).toHaveBeenCalledWith('/liked-tracks/42');
          done();
        },
      });
    });

    it('should propagate API errors', (done) => {
      const error = new Error('Delete failed');
      apiService.delete.and.returnValue(throwError(() => error));

      service.deleteLikedTrack(1).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });
});
