import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Game } from '../../../../core/models/game.model';
import { GameService } from '../../../../core/services/game.service';

@Component({
  standalone: false,
  selector: 'app-games-list',
  templateUrl: './games-list.html',
  styleUrls: ['./games-list.scss'],
})
export class GamesList implements OnInit {
  allGames: Game[] = [];
  filteredGames: Game[] = [];
  paginatedGames: Game[] = [];

  isLoading = false;

  gameService = inject(GameService);
  router = inject(Router);

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;

  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  searchValue = '';
  enabledFilter: '' | 'on' | 'off' = '';
  multiplayerFilter: '' | 'solo' | 'multi' = '';

  private snackbarTimeout: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.loadGames();
  }

  loadGames(): void {
    this.isLoading = true;
    this.gameService.getGames().subscribe({
      next: (games) => {
        this.allGames = games;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading games:', error);
        this.showSnackbar('Erreur lors du chargement des jeux', 'error');
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

  onEnabledFilterChange(event: Event): void {
    this.enabledFilter = (event.target as HTMLSelectElement).value as
      | ''
      | 'on'
      | 'off';
    this.applyFilters();
  }

  onMultiplayerFilterChange(event: Event): void {
    this.multiplayerFilter = (event.target as HTMLSelectElement).value as
      | ''
      | 'solo'
      | 'multi';
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.allGames];

    if (this.searchValue) {
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(this.searchValue) ||
          g.description?.toLowerCase().includes(this.searchValue),
      );
    }

    if (this.enabledFilter) {
      const wantEnabled = this.enabledFilter === 'on';
      result = result.filter((g) => g.isEnabled === wantEnabled);
    }

    if (this.multiplayerFilter) {
      const wantMulti = this.multiplayerFilter === 'multi';
      result = result.filter((g) => g.isMultiplayer === wantMulti);
    }

    this.filteredGames = result;
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

    this.filteredGames.sort((a, b) => {
      let aValue: string | number | boolean | Date | null | undefined =
        a[column as keyof Game];
      let bValue: string | number | boolean | Date | null | undefined =
        b[column as keyof Game];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (column === 'createdAt') {
        aValue = new Date(aValue as Date).getTime();
        bValue = new Date(bValue as Date).getTime();
      }

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.updatePagination();
  }

  updatePagination(): void {
    const data = this.filteredGames;
    this.totalPages = Math.ceil(data.length / this.pageSize);

    if (this.currentPage >= this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages - 1;
    }

    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedGames = data.slice(start, end);
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
    const data = this.filteredGames;
    if (data.length === 0) return '0 sur 0';

    const start = this.currentPage * this.pageSize + 1;
    const end = Math.min((this.currentPage + 1) * this.pageSize, data.length);
    return `${start} - ${end} sur ${data.length}`;
  }

  viewGame(game: Game): void {
    this.router.navigate(['/games', game.id]);
  }

  editGame(game: Game): void {
    this.router.navigate(['/games', game.id, 'edit']);
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
