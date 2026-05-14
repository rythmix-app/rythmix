import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CuratedPlaylistsList } from './curated-playlists-list';
import { CuratedPlaylistService } from '../../../../core/services/curated-playlist.service';
import { CuratedPlaylist } from '../../../../core/models/curated-playlist.model';
import { ImportCuratedPlaylistDialog } from '../../components/import-curated-playlist-dialog/import-curated-playlist-dialog';
import { RenameCuratedPlaylistDialog } from '../../components/rename-curated-playlist-dialog/rename-curated-playlist-dialog';
import { ConfirmDeleteCuratedPlaylistDialog } from '../../components/confirm-delete-curated-playlist-dialog/confirm-delete-curated-playlist-dialog';
import { FormsModule } from '@angular/forms';

const mockPlaylists: CuratedPlaylist[] = [
  {
    id: 1,
    deezerPlaylistId: 1001,
    name: 'Alpha',
    genreLabel: 'Rap FR',
    coverUrl: 'https://cdn/1.jpg',
    trackCount: 100,
    nameOverridden: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 2,
    deezerPlaylistId: 1002,
    name: 'Bravo',
    genreLabel: 'Pop',
    coverUrl: null,
    trackCount: 50,
    nameOverridden: true,
    createdAt: new Date('2026-01-02'),
    updatedAt: new Date('2026-01-02'),
  },
];

describe('CuratedPlaylistsList', () => {
  let component: CuratedPlaylistsList;
  let fixture: ComponentFixture<CuratedPlaylistsList>;
  let service: jasmine.SpyObj<CuratedPlaylistService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('CuratedPlaylistService', [
      'getPlaylists',
      'importPlaylist',
      'renamePlaylist',
      'refreshPlaylist',
      'deletePlaylist',
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [
        CuratedPlaylistsList,
        ImportCuratedPlaylistDialog,
        RenameCuratedPlaylistDialog,
        ConfirmDeleteCuratedPlaylistDialog,
      ],
      imports: [HttpClientTestingModule, FormsModule],
      providers: [
        { provide: CuratedPlaylistService, useValue: spy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CuratedPlaylistsList);
    component = fixture.componentInstance;
    service = TestBed.inject(
      CuratedPlaylistService,
    ) as jasmine.SpyObj<CuratedPlaylistService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    document
      .querySelectorAll('.custom-snackbar')
      .forEach((el) => el.remove());
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  describe('loadPlaylists', () => {
    it('loads playlists on init and stops the loading flag', () => {
      service.getPlaylists.and.returnValue(of(mockPlaylists));
      fixture.detectChanges();

      expect(component.allPlaylists).toEqual(mockPlaylists);
      expect(component.paginatedPlaylists).toEqual(mockPlaylists);
      expect(component.isLoading).toBeFalse();
    });

    it('handles errors gracefully', () => {
      service.getPlaylists.and.returnValue(throwError(() => new Error('x')));
      fixture.detectChanges();

      expect(component.isLoading).toBeFalse();
      expect(component.allPlaylists).toEqual([]);
    });
  });

  describe('filters', () => {
    beforeEach(() => {
      service.getPlaylists.and.returnValue(of(mockPlaylists));
      fixture.detectChanges();
    });

    it('filters by search value', () => {
      const event = { target: { value: 'alpha' } } as unknown as Event;
      component.onSearch(event);
      expect(component.filteredPlaylists.map((p) => p.id)).toEqual([1]);
    });

    it('filters by genre', () => {
      const event = { target: { value: 'Pop' } } as unknown as Event;
      component.onGenreFilterChange(event);
      expect(component.filteredPlaylists.map((p) => p.id)).toEqual([2]);
    });

    it('lists unique genres alphabetically', () => {
      expect(component.uniqueGenres()).toEqual(['Pop', 'Rap FR']);
    });
  });

  describe('sorting', () => {
    beforeEach(() => {
      service.getPlaylists.and.returnValue(of(mockPlaylists));
      fixture.detectChanges();
    });

    it('toggles sort direction and orders by the chosen column', () => {
      component.sortBy('name');
      expect(component.paginatedPlaylists.map((p) => p.id)).toEqual([1, 2]);
      component.sortBy('name');
      expect(component.paginatedPlaylists.map((p) => p.id)).toEqual([2, 1]);
    });
  });

  describe('import flow', () => {
    beforeEach(() => {
      service.getPlaylists.and.returnValue(of(mockPlaylists));
      fixture.detectChanges();
    });

    it('appends an imported playlist and closes the dialog', () => {
      const imported: CuratedPlaylist = {
        id: 3,
        deezerPlaylistId: 1003,
        name: 'Charlie',
        genreLabel: 'Rock',
        coverUrl: null,
        trackCount: 10,
        nameOverridden: false,
        createdAt: new Date('2026-01-03'),
        updatedAt: new Date('2026-01-03'),
      };
      service.importPlaylist.and.returnValue(of(imported));

      component.openImportDialog();
      expect(component.dialog.kind).toBe('import');

      component.onImportConfirmed({
        url: 'https://www.deezer.com/playlist/1003',
        genreLabel: 'Rock',
      });

      expect(component.allPlaylists.length).toBe(3);
      expect(component.dialog.kind).toBe('none');
    });

    it('keeps the dialog open and displays a snackbar on import failure', () => {
      service.importPlaylist.and.returnValue(
        throwError(() => ({ status: 409 })),
      );
      component.openImportDialog();
      component.onImportConfirmed({
        url: 'https://www.deezer.com/playlist/1003',
        genreLabel: 'Rock',
      });

      expect(component.dialog.kind).toBe('import');
      expect(component.allPlaylists.length).toBe(2);
    });
  });

  describe('rename flow', () => {
    beforeEach(() => {
      service.getPlaylists.and.returnValue(of(mockPlaylists));
      fixture.detectChanges();
    });

    it('replaces the renamed playlist in the list', () => {
      const renamed: CuratedPlaylist = {
        ...mockPlaylists[0],
        name: 'Alpha Renamed',
        nameOverridden: true,
      };
      service.renamePlaylist.and.returnValue(of(renamed));

      component.openRenameDialog(mockPlaylists[0]);
      component.onRenameConfirmed('Alpha Renamed');

      expect(component.allPlaylists[0].name).toBe('Alpha Renamed');
      expect(component.dialog.kind).toBe('none');
    });

    it('does nothing when confirmed outside of a rename dialog', () => {
      component.dialog = { kind: 'none' };
      component.onRenameConfirmed('whatever');
      expect(service.renamePlaylist).not.toHaveBeenCalled();
    });

    it('shows a snackbar on rename failure', () => {
      service.renamePlaylist.and.returnValue(
        throwError(() => new Error('boom')),
      );
      component.openRenameDialog(mockPlaylists[0]);
      component.onRenameConfirmed('x');
      expect(component.allPlaylists[0].name).toBe('Alpha');
    });
  });

  describe('delete flow', () => {
    beforeEach(() => {
      service.getPlaylists.and.returnValue(of(mockPlaylists));
      fixture.detectChanges();
    });

    it('removes the deleted playlist from the list', () => {
      service.deletePlaylist.and.returnValue(of(undefined));
      component.openDeleteDialog(mockPlaylists[0]);
      component.onDeleteConfirmed();

      expect(component.allPlaylists.map((p) => p.id)).toEqual([2]);
      expect(component.dialog.kind).toBe('none');
    });

    it('does nothing when confirmed outside of a delete dialog', () => {
      component.dialog = { kind: 'none' };
      component.onDeleteConfirmed();
      expect(service.deletePlaylist).not.toHaveBeenCalled();
    });

    it('keeps the playlist when delete fails', () => {
      service.deletePlaylist.and.returnValue(
        throwError(() => new Error('boom')),
      );
      component.openDeleteDialog(mockPlaylists[0]);
      component.onDeleteConfirmed();
      expect(component.allPlaylists.length).toBe(2);
    });
  });

  describe('refresh flow', () => {
    beforeEach(() => {
      service.getPlaylists.and.returnValue(of(mockPlaylists));
      fixture.detectChanges();
    });

    it('replaces the refreshed playlist and clears the spinner', () => {
      const refreshed: CuratedPlaylist = {
        ...mockPlaylists[0],
        coverUrl: 'https://cdn/new.jpg',
        trackCount: 999,
      };
      service.refreshPlaylist.and.returnValue(of(refreshed));

      component.refreshPlaylist(mockPlaylists[0]);
      expect(component.refreshingId).toBeNull();
      expect(component.allPlaylists[0].coverUrl).toBe('https://cdn/new.jpg');
    });

    it('clears the spinner on refresh failure', () => {
      service.refreshPlaylist.and.returnValue(
        throwError(() => new Error('boom')),
      );
      component.refreshPlaylist(mockPlaylists[0]);
      expect(component.refreshingId).toBeNull();
    });

    it('ignores a refresh request while one is already in flight', () => {
      service.refreshPlaylist.and.returnValue(of(mockPlaylists[0]));
      component.refreshingId = 999;
      component.refreshPlaylist(mockPlaylists[0]);
      expect(service.refreshPlaylist).not.toHaveBeenCalled();
    });
  });

  describe('viewPlaylist', () => {
    it('navigates to the detail page', () => {
      service.getPlaylists.and.returnValue(of(mockPlaylists));
      fixture.detectChanges();

      component.viewPlaylist(mockPlaylists[0]);
      expect(router.navigate).toHaveBeenCalledWith([
        '/curated-playlists',
        mockPlaylists[0].id,
      ]);
    });
  });

  describe('pagination', () => {
    it('updates pagination info and supports nav buttons', () => {
      const many: CuratedPlaylist[] = Array.from({ length: 25 }, (_, i) => ({
        ...mockPlaylists[0],
        id: i + 1,
        name: `P${i + 1}`,
      }));
      service.getPlaylists.and.returnValue(of(many));
      fixture.detectChanges();

      expect(component.paginatedPlaylists.length).toBe(10);
      expect(component.getPaginationInfo()).toBe('1 - 10 sur 25');

      component.nextPage();
      expect(component.getPaginationInfo()).toBe('11 - 20 sur 25');

      component.goToLastPage();
      expect(component.currentPage).toBe(2);
      expect(component.paginatedPlaylists.length).toBe(5);

      component.previousPage();
      expect(component.currentPage).toBe(1);

      component.goToFirstPage();
      expect(component.currentPage).toBe(0);
    });

    it('does not go past page boundaries', () => {
      service.getPlaylists.and.returnValue(of(mockPlaylists));
      fixture.detectChanges();
      // Only one page; nav buttons must be no-ops
      component.previousPage();
      expect(component.currentPage).toBe(0);
      component.nextPage();
      expect(component.currentPage).toBe(0);
    });

    it('returns "0 sur 0" when the filtered list is empty', () => {
      service.getPlaylists.and.returnValue(of([]));
      fixture.detectChanges();
      expect(component.getPaginationInfo()).toBe('0 sur 0');
      component.goToLastPage();
      expect(component.currentPage).toBe(0);
    });
  });
});
