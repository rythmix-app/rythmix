import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CuratedPlaylistService } from './curated-playlist.service';
import { ApiService } from './api.service';
import { CuratedPlaylist } from '../models/curated-playlist.model';

describe('CuratedPlaylistService', () => {
  let service: CuratedPlaylistService;
  let apiService: jasmine.SpyObj<ApiService>;

  const mockPlaylist: CuratedPlaylist = {
    id: 1,
    deezerPlaylistId: 15223693943,
    name: 'Rap FR',
    genreLabel: 'Rap FR',
    coverUrl: 'https://cdn/cover.jpg',
    trackCount: 1731,
    nameOverridden: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('ApiService', [
      'get',
      'post',
      'patch',
      'delete',
    ]);

    TestBed.configureTestingModule({
      providers: [
        CuratedPlaylistService,
        { provide: ApiService, useValue: apiSpy },
      ],
    });

    service = TestBed.inject(CuratedPlaylistService);
    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getPlaylists', () => {
    it('should fetch all playlists', (done) => {
      apiService.get.and.returnValue(of({ playlists: [mockPlaylist] }));

      service.getPlaylists().subscribe({
        next: (playlists) => {
          expect(playlists).toEqual([mockPlaylist]);
          expect(apiService.get).toHaveBeenCalledWith(
            '/games/blindtest/playlists',
          );
          done();
        },
      });
    });

    it('should propagate errors', (done) => {
      const error = new Error('Network error');
      apiService.get.and.returnValue(throwError(() => error));

      service.getPlaylists().subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('importPlaylist', () => {
    it('should POST the import payload and unwrap the playlist', (done) => {
      apiService.post.and.returnValue(of({ playlist: mockPlaylist }));
      const dto = {
        url: 'https://www.deezer.com/fr/playlist/15223693943',
        genreLabel: 'Rap FR',
      };

      service.importPlaylist(dto).subscribe({
        next: (playlist) => {
          expect(playlist).toEqual(mockPlaylist);
          expect(apiService.post).toHaveBeenCalledWith(
            '/games/blindtest/playlists',
            dto,
          );
          done();
        },
      });
    });

    it('should propagate errors', (done) => {
      const error = { status: 409 };
      apiService.post.and.returnValue(throwError(() => error));
      service
        .importPlaylist({
          url: 'https://www.deezer.com/playlist/1',
          genreLabel: 'Pop',
        })
        .subscribe({
          error: (err) => {
            expect(err).toBe(error);
            done();
          },
        });
    });
  });

  describe('renamePlaylist', () => {
    it('should PATCH the new name', (done) => {
      const renamed: CuratedPlaylist = {
        ...mockPlaylist,
        name: 'Renamed',
        nameOverridden: true,
      };
      apiService.patch.and.returnValue(of({ playlist: renamed }));

      service.renamePlaylist(1, { name: 'Renamed' }).subscribe({
        next: (playlist) => {
          expect(playlist.name).toBe('Renamed');
          expect(playlist.nameOverridden).toBeTrue();
          expect(apiService.patch).toHaveBeenCalledWith(
            '/games/blindtest/playlists/1',
            { name: 'Renamed' },
          );
          done();
        },
      });
    });

    it('should propagate errors', (done) => {
      const error = new Error('boom');
      apiService.patch.and.returnValue(throwError(() => error));
      service.renamePlaylist(1, { name: 'x' }).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('refreshPlaylist', () => {
    it('should POST to the refresh endpoint with an empty body', (done) => {
      const refreshed: CuratedPlaylist = {
        ...mockPlaylist,
        trackCount: 9999,
      };
      apiService.post.and.returnValue(of({ playlist: refreshed }));

      service.refreshPlaylist(1).subscribe({
        next: (playlist) => {
          expect(playlist.trackCount).toBe(9999);
          expect(apiService.post).toHaveBeenCalledWith(
            '/games/blindtest/playlists/1/refresh',
            {},
          );
          done();
        },
      });
    });

    it('should propagate errors', (done) => {
      const error = new Error('boom');
      apiService.post.and.returnValue(throwError(() => error));
      service.refreshPlaylist(1).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('deletePlaylist', () => {
    it('should DELETE the resource', (done) => {
      apiService.delete.and.returnValue(of(undefined));
      service.deletePlaylist(1).subscribe({
        next: () => {
          expect(apiService.delete).toHaveBeenCalledWith(
            '/games/blindtest/playlists/1',
          );
          done();
        },
      });
    });

    it('should propagate errors', (done) => {
      const error = new Error('boom');
      apiService.delete.and.returnValue(throwError(() => error));
      service.deletePlaylist(1).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('getAllTracks', () => {
    it('should GET the all-tracks endpoint and unwrap the array', (done) => {
      const tracks = [
        {
          id: 1,
          title: 'Song',
          title_short: 'Song',
          preview: 'p',
          duration: 180,
          artist: { id: 1, name: 'A' },
          album: { id: 1, title: 'Alb' },
        },
      ];
      apiService.get.and.returnValue(of({ tracks }));

      service.getAllTracks(42).subscribe({
        next: (result) => {
          expect(result).toEqual(tracks);
          expect(apiService.get).toHaveBeenCalledWith(
            '/games/blindtest/playlists/42/all-tracks',
          );
          done();
        },
      });
    });

    it('should propagate errors', (done) => {
      const error = new Error('boom');
      apiService.get.and.returnValue(throwError(() => error));
      service.getAllTracks(1).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });
});
