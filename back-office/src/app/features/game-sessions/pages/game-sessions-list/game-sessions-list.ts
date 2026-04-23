import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  GAME_SESSION_STATUSES,
  GameSession,
  GameSessionStatus,
} from '../../../../core/models/game-session.model';
import { GameSessionService } from '../../../../core/services/game-session.service';
import { UserService } from '../../../../core/services/user.service';

@Component({
  standalone: false,
  selector: 'app-game-sessions-list',
  templateUrl: './game-sessions-list.html',
  styleUrls: ['./game-sessions-list.scss'],
})
export class GameSessionsList implements OnInit {
  allSessions: GameSession[] = [];
  filteredSessions: GameSession[] = [];
  paginatedSessions: GameSession[] = [];

  isLoading = false;

  gameSessionService = inject(GameSessionService);
  userService = inject(UserService);
  router = inject(Router);

  usernameByUserId = new Map<string, string>();

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;

  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  searchValue = '';
  statusFilter: GameSessionStatus | '' = '';
  statusOptions = GAME_SESSION_STATUSES;

  private snackbarTimeout: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.isLoading = true;
    forkJoin({
      sessions: this.gameSessionService.getGameSessions(),
      users: this.userService.getUsers({ includeDeleted: true }),
    }).subscribe({
      next: ({ sessions, users }) => {
        this.usernameByUserId = new Map(users.map((u) => [u.id, u.username]));
        this.allSessions = sessions;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading game sessions:', error);
        this.showSnackbar('Erreur lors du chargement des sessions', 'error');
        this.isLoading = false;
      },
    });
  }

  getPlayerNames(session: GameSession): string {
    if (!session.players || session.players.length === 0) return '—';

    const names = session.players.map(
      (p) => this.usernameByUserId.get(p.userId) || p.userId.slice(0, 8),
    );

    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  }

  onSearch(event: Event): void {
    this.searchValue = (event.target as HTMLInputElement).value
      .toLowerCase()
      .trim();
    this.applyFilters();
  }

  onStatusFilterChange(event: Event): void {
    this.statusFilter = (event.target as HTMLSelectElement)
      .value as GameSessionStatus | '';
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.allSessions];

    if (this.searchValue) {
      result = result.filter(
        (s) =>
          s.id.toLowerCase().includes(this.searchValue) ||
          String(s.gameId).includes(this.searchValue) ||
          s.players.some(
            (p) =>
              p.userId.toLowerCase().includes(this.searchValue) ||
              (this.usernameByUserId.get(p.userId) || '')
                .toLowerCase()
                .includes(this.searchValue),
          ),
      );
    }

    if (this.statusFilter) {
      result = result.filter((s) => s.status === this.statusFilter);
    }

    this.filteredSessions = result;
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

    this.filteredSessions.sort((a, b) => {
      let aValue: string | number | Date | null | undefined =
        a[column as keyof GameSession] as string | number | Date | undefined;
      let bValue: string | number | Date | null | undefined =
        b[column as keyof GameSession] as string | number | Date | undefined;

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (column === 'createdAt' || column === 'updatedAt') {
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
    const data = this.filteredSessions;
    this.totalPages = Math.ceil(data.length / this.pageSize);

    if (this.currentPage >= this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages - 1;
    }

    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedSessions = data.slice(start, end);
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
    const data = this.filteredSessions;
    if (data.length === 0) return '0 sur 0';

    const start = this.currentPage * this.pageSize + 1;
    const end = Math.min((this.currentPage + 1) * this.pageSize, data.length);
    return `${start} - ${end} sur ${data.length}`;
  }

  viewSession(session: GameSession): void {
    this.router.navigate(['/sessions', session.id]);
  }

  editSession(session: GameSession): void {
    this.router.navigate(['/sessions', session.id, 'edit']);
  }

  deleteSession(session: GameSession): void {
    if (!confirm(`Supprimer la session ${session.id} ?`)) return;

    this.gameSessionService.deleteGameSession(session.id).subscribe({
      next: () => {
        this.allSessions = this.allSessions.filter((s) => s.id !== session.id);
        this.applyFilters();
        this.showSnackbar('Session supprimée', 'success');
      },
      error: (error) => {
        console.error('Error deleting session:', error);
        this.showSnackbar('Erreur lors de la suppression', 'error');
      },
    });
  }

  shortId(id: string): string {
    return id ? id.slice(0, 8) : '';
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
