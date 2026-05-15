import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { CuratedPlaylistDetail } from './curated-playlist-detail';
import { CuratedPlaylistService } from '../../../../core/services/curated-playlist.service';
import {
  CuratedPlaylist,
  DeezerTrack,
} from '../../../../core/models/curated-playlist.model';

const mockPlaylist: CuratedPlaylist = {
  id: 1,
  deezerPlaylistId: 1001,
  name: 'Alpha',
  genreLabel: 'Rap FR',
  coverUrl: null,
  trackCount: 2,
  nameOverridden: false,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockTracks: DeezerTrack[] = [
  {
    id: 100,
    title: 'Premier titre',
    title_short: 'Premier titre',
    preview: 'p',
    duration: 185,
    artist: { id: 1, name: 'Artiste A' },
    album: { id: 1, title: 'Album A' },
  },
  {
    id: 200,
    title: 'Deuxième morceau',
    title_short: 'Deuxième',
    preview: 'p',
    duration: 60,
    artist: { id: 2, name: 'Artiste B' },
    album: { id: 2, title: 'Album B' },
  },
];

describe('CuratedPlaylistDetail', () => {
  let component: CuratedPlaylistDetail;
  let fixture: ComponentFixture<CuratedPlaylistDetail>;
  let service: jasmine.SpyObj<CuratedPlaylistService>;
  let router: jasmine.SpyObj<Router>;

  function setup(idParam: string | null) {
    const serviceSpy = jasmine.createSpyObj('CuratedPlaylistService', [
      'getPlaylists',
      'getAllTracks',
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const route = {
      snapshot: { paramMap: convertToParamMap({ id: idParam }) },
    } as unknown as ActivatedRoute;

    TestBed.configureTestingModule({
      declarations: [CuratedPlaylistDetail],
      imports: [HttpClientTestingModule],
      providers: [
        { provide: CuratedPlaylistService, useValue: serviceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: route },
      ],
    });

    fixture = TestBed.createComponent(CuratedPlaylistDetail);
    component = fixture.componentInstance;
    service = TestBed.inject(
      CuratedPlaylistService,
    ) as jasmine.SpyObj<CuratedPlaylistService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  }

  it('navigates back to the list when the route param is not numeric', () => {
    setup('not-a-number');
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/curated-playlists']);
  });

  it('loads the playlist and its tracks', () => {
    setup('1');
    service.getPlaylists.and.returnValue(of([mockPlaylist]));
    service.getAllTracks.and.returnValue(of(mockTracks));

    fixture.detectChanges();

    expect(component.playlist).toEqual(mockPlaylist);
    expect(component.tracks).toEqual(mockTracks);
    expect(component.filteredTracks).toEqual(mockTracks);
    expect(component.isLoading).toBeFalse();
    expect(component.loadError).toBeFalse();
  });

  it('sets loadError when the playlist id is unknown', () => {
    setup('999');
    service.getPlaylists.and.returnValue(of([mockPlaylist]));
    service.getAllTracks.and.returnValue(of([]));

    fixture.detectChanges();

    expect(component.playlist).toBeNull();
    expect(component.loadError).toBeTrue();
  });

  it('sets loadError when the tracks call fails', () => {
    setup('1');
    service.getPlaylists.and.returnValue(of([mockPlaylist]));
    service.getAllTracks.and.returnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();

    expect(component.loadError).toBeTrue();
    expect(component.isLoading).toBeFalse();
  });

  describe('search', () => {
    beforeEach(() => {
      setup('1');
      service.getPlaylists.and.returnValue(of([mockPlaylist]));
      service.getAllTracks.and.returnValue(of(mockTracks));
      fixture.detectChanges();
    });

    it('filters tracks by title', () => {
      const event = { target: { value: 'premier' } } as unknown as Event;
      component.onSearch(event);
      expect(component.filteredTracks.map((t) => t.id)).toEqual([100]);
    });

    it('filters tracks by artist name', () => {
      const event = { target: { value: 'artiste b' } } as unknown as Event;
      component.onSearch(event);
      expect(component.filteredTracks.map((t) => t.id)).toEqual([200]);
    });

    it('filters tracks by album title', () => {
      const event = { target: { value: 'album a' } } as unknown as Event;
      component.onSearch(event);
      expect(component.filteredTracks.map((t) => t.id)).toEqual([100]);
    });

    it('resets the filter when the search value is empty', () => {
      const event1 = { target: { value: 'premier' } } as unknown as Event;
      component.onSearch(event1);
      const event2 = { target: { value: '' } } as unknown as Event;
      component.onSearch(event2);
      expect(component.filteredTracks).toEqual(mockTracks);
    });
  });

  describe('formatDuration', () => {
    beforeEach(() => {
      setup('1');
      service.getPlaylists.and.returnValue(of([mockPlaylist]));
      service.getAllTracks.and.returnValue(of(mockTracks));
      fixture.detectChanges();
    });

    it('pads seconds with a leading zero when below 10', () => {
      expect(component.formatDuration(65)).toBe('1:05');
    });

    it('returns m:ss for typical durations', () => {
      expect(component.formatDuration(185)).toBe('3:05');
      expect(component.formatDuration(0)).toBe('0:00');
    });
  });

  describe('back', () => {
    it('navigates back to the list', () => {
      setup('1');
      service.getPlaylists.and.returnValue(of([mockPlaylist]));
      service.getAllTracks.and.returnValue(of(mockTracks));
      fixture.detectChanges();

      component.back();
      expect(router.navigate).toHaveBeenCalledWith(['/curated-playlists']);
    });
  });
});
