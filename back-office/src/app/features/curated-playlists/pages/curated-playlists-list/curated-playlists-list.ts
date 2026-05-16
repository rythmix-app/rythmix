import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CuratedPlaylist } from '../../../../core/models/curated-playlist.model';
import { CuratedPlaylistService } from '../../../../core/services/curated-playlist.service';

type DialogState =
  | { kind: 'none' }
  | { kind: 'import' }
  | { kind: 'rename'; playlist: CuratedPlaylist }
  | { kind: 'delete'; playlist: CuratedPlaylist };

@Component({
  standalone: false,
  selector: 'app-curated-playlists-list',
  templateUrl: './curated-playlists-list.html',
  styleUrls: ['./curated-playlists-list.scss'],
})
export class CuratedPlaylistsList implements OnInit {
  allPlaylists: CuratedPlaylist[] = [];
  filteredPlaylists: CuratedPlaylist[] = [];
  paginatedPlaylists: CuratedPlaylist[] = [];

  isLoading = false;
  refreshingId: number | null = null;
  dialog: DialogState = { kind: 'none' };

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;

  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  searchValue = '';
  genreFilter = '';

  private readonly service = inject(CuratedPlaylistService);
  private readonly router = inject(Router);
  private snackbarTimeout: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.loadPlaylists();
  }

  loadPlaylists(): void {
    this.isLoading = true;
    this.service.getPlaylists().subscribe({
      next: (playlists) => {
        this.allPlaylists = playlists;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.showSnackbar('Erreur lors du chargement des playlists', 'error');
        this.isLoading = false;
      },
    });
  }

  onSearch(event: Event): void {
    this.searchValue = (event.target as HTMLInputElement).value
      .toLowerCase()
      .trim();
    this.applyFilters();
  }

  onGenreFilterChange(event: Event): void {
    this.genreFilter = (event.target as HTMLSelectElement).value;
    this.applyFilters();
  }

  uniqueGenres(): string[] {
    return Array.from(new Set(this.allPlaylists.map((p) => p.genreLabel))).sort(
      (a, b) => a.localeCompare(b),
    );
  }

  applyFilters(): void {
    let result = [...this.allPlaylists];
    if (this.searchValue) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(this.searchValue) ||
          p.genreLabel.toLowerCase().includes(this.searchValue),
      );
    }
    if (this.genreFilter) {
      result = result.filter((p) => p.genreLabel === this.genreFilter);
    }
    this.filteredPlaylists = result;
    this.currentPage = 0;
    this.updatePagination();
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredPlaylists.sort((a, b) => {
      const aValue = a[column as keyof CuratedPlaylist];
      const bValue = b[column as keyof CuratedPlaylist];
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.updatePagination();
  }

  updatePagination(): void {
    const data = this.filteredPlaylists;
    this.totalPages = Math.ceil(data.length / this.pageSize);
    if (this.currentPage >= this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages - 1;
    }
    const start = this.currentPage * this.pageSize;
    this.paginatedPlaylists = data.slice(start, start + this.pageSize);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  goToFirstPage(): void {
    this.currentPage = 0;
    this.updatePagination();
  }

  goToLastPage(): void {
    if (this.totalPages > 0) {
      this.currentPage = this.totalPages - 1;
      this.updatePagination();
    }
  }

  getPaginationInfo(): string {
    const data = this.filteredPlaylists;
    if (data.length === 0) return '0 sur 0';
    const start = this.currentPage * this.pageSize + 1;
    const end = Math.min((this.currentPage + 1) * this.pageSize, data.length);
    return `${start} - ${end} sur ${data.length}`;
  }

  viewPlaylist(playlist: CuratedPlaylist): void {
    this.router.navigate(['/curated-playlists', playlist.id]);
  }

  openImportDialog(): void {
    this.dialog = { kind: 'import' };
  }

  openRenameDialog(playlist: CuratedPlaylist): void {
    this.dialog = { kind: 'rename', playlist };
  }

  openDeleteDialog(playlist: CuratedPlaylist): void {
    this.dialog = { kind: 'delete', playlist };
  }

  closeDialog(): void {
    this.dialog = { kind: 'none' };
  }

  onImportConfirmed(dto: { url: string; genreLabel: string }): void {
    this.service.importPlaylist(dto).subscribe({
      next: (playlist) => {
        this.allPlaylists = [...this.allPlaylists, playlist];
        this.applyFilters();
        this.closeDialog();
        this.showSnackbar('Playlist importée', 'success');
      },
      error: (err) => {
        this.showSnackbar(this.errorMessageForImport(err), 'error');
      },
    });
  }

  onRenameConfirmed(name: string): void {
    if (this.dialog.kind !== 'rename') return;
    const target = this.dialog.playlist;
    this.service.renamePlaylist(target.id, { name }).subscribe({
      next: (updated) => {
        this.allPlaylists = this.allPlaylists.map((p) =>
          p.id === updated.id ? updated : p,
        );
        this.applyFilters();
        this.closeDialog();
        this.showSnackbar('Playlist renommée', 'success');
      },
      error: () => {
        this.showSnackbar('Erreur lors du renommage', 'error');
      },
    });
  }

  onDeleteConfirmed(): void {
    if (this.dialog.kind !== 'delete') return;
    const target = this.dialog.playlist;
    this.service.deletePlaylist(target.id).subscribe({
      next: () => {
        this.allPlaylists = this.allPlaylists.filter((p) => p.id !== target.id);
        this.applyFilters();
        this.closeDialog();
        this.showSnackbar('Playlist supprimée', 'success');
      },
      error: () => {
        this.showSnackbar('Erreur lors de la suppression', 'error');
      },
    });
  }

  refreshPlaylist(playlist: CuratedPlaylist): void {
    if (this.refreshingId !== null) return;
    this.refreshingId = playlist.id;
    this.service.refreshPlaylist(playlist.id).subscribe({
      next: (updated) => {
        this.allPlaylists = this.allPlaylists.map((p) =>
          p.id === updated.id ? updated : p,
        );
        this.applyFilters();
        this.refreshingId = null;
        this.showSnackbar('Playlist rafraîchie', 'success');
      },
      error: () => {
        this.refreshingId = null;
        this.showSnackbar('Erreur lors du rafraîchissement', 'error');
      },
    });
  }

  private errorMessageForImport(err: unknown): string {
    const status = (err as { status?: number })?.status;
    switch (status) {
      case 400:
        return 'URL Deezer invalide';
      case 404:
        return 'Playlist introuvable sur Deezer';
      case 409:
        return 'Cette playlist Deezer est déjà importée';
      case 502:
        return 'Deezer est temporairement indisponible';
      case 422:
        return 'Champs manquants ou invalides';
      default:
        return "Erreur lors de l'import";
    }
  }

  private showSnackbar(
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
  ): void {
    const snackbar = document.createElement('div');
    snackbar.className = `custom-snackbar snackbar-${type}`;
    snackbar.textContent = message;
    document.body.appendChild(snackbar);

    setTimeout(() => snackbar.classList.add('show'), 10);

    if (this.snackbarTimeout) {
      clearTimeout(this.snackbarTimeout);
    }

    this.snackbarTimeout = setTimeout(() => {
      snackbar.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(snackbar)) {
          snackbar.remove();
        }
      }, 300);
    }, 3000);
  }
}
