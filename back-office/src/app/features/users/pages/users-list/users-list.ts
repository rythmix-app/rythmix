import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { User, UserFilters } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/auth/auth';

@Component({
  standalone: false,
  selector: 'app-users-list',
  templateUrl: './users-list.html',
  styleUrls: ['./users-list.scss'],
})
export class UsersList implements OnInit {
  allUsers: User[] = [];
  filteredUsers: User[] = [];
  paginatedUsers: User[] = [];

  isLoading = false;
  filters: UserFilters = {
    includeDeleted: false,
  };

  userService = inject(UserService);
  authService = inject(AuthService);
  router = inject(Router);

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  pageSizeOptions = [10, 25, 50, 100];

  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  private snackbarTimeout: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getUsers(this.filters).subscribe({
      next: (users) => {
        this.allUsers = users;
        this.filteredUsers = [...users];
        this.currentPage = 0;
        this.updatePagination();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.showSnackbar(
          'Erreur lors du chargement des utilisateurs',
          'error',
        );
        this.isLoading = false;
      },
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value
      .toLowerCase()
      .trim();

    if (!filterValue) {
      this.filteredUsers = [...this.allUsers];
    } else {
      this.filteredUsers = this.allUsers.filter(
        (user) =>
          user.username.toLowerCase().includes(filterValue) ||
          user.email.toLowerCase().includes(filterValue),
      );
    }

    this.currentPage = 0;
    this.updatePagination();
  }

  toggleIncludeDeleted(): void {
    this.loadUsers();
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredUsers.sort((a, b) => {
      let aValue: string | number | Date | null | undefined =
        a[column as keyof User];
      let bValue: string | number | Date | null | undefined =
        b[column as keyof User];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (column === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.updatePagination();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '⇅';
    return this.sortDirection === 'asc' ? '▲' : '▼';
  }

  updatePagination(): void {
    const data = this.filteredUsers;
    this.totalPages = Math.ceil(data.length / this.pageSize);

    if (this.currentPage >= this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages - 1;
    }

    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedUsers = data.slice(start, end);
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

  onPageSizeChange(): void {
    this.currentPage = 0;
    this.updatePagination();
  }

  getPaginationInfo(): string {
    const data = this.filteredUsers;
    if (data.length === 0) return '0 sur 0';

    const start = this.currentPage * this.pageSize + 1;
    const end = Math.min((this.currentPage + 1) * this.pageSize, data.length);
    return `${start} - ${end} sur ${data.length}`;
  }

  viewUser(user: User): void {
    this.router.navigate(['/users', user.id]);
  }

  editUser(user: User): void {
    this.router.navigate(['/users', user.id, 'edit']);
  }

  deleteUser(user: User): void {
    // === DEBUG LOGS ===
    const currentUser = this.authService.getCurrentUser();
    console.log('🔍 DEBUG - Tentative de suppression');
    console.log('Current user:', currentUser);
    console.log('Current user role:', currentUser?.role);
    console.log('Is admin?', this.authService.isAdmin());
    console.log('User to delete:', user);
    console.log(
      'Token:',
      this.authService.getAccessToken()?.substring(0, 20) + '...',
    );
    // === END DEBUG ===

    if (
      confirm(
        `Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.username} ?`,
      )
    ) {
      this.userService.deleteUser(user.id).subscribe({
        next: () => {
          this.showSnackbar('Utilisateur supprimé avec succès', 'success');
          this.loadUsers();
        },
        error: (error) => {
          console.error('❌ Error deleting user:', error);
          console.error('Error status:', error.status);
          console.error('Error statusText:', error.statusText);
          console.error('Error body:', error.error);
          console.error('Error message:', error.message);

          // Afficher le message exact du backend si disponible
          const errorMessage =
            error.error?.message || 'Erreur lors de la suppression';
          this.showSnackbar(errorMessage, 'error');
        },
      });
    }
  }

  restoreUser(user: User): void {
    this.userService.restoreUser(user.id).subscribe({
      next: () => {
        this.showSnackbar('Utilisateur restauré avec succès', 'success');
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error restoring user:', error);
        this.showSnackbar('Erreur lors de la restauration', 'error');
      },
    });
  }

  createUser(): void {
    this.router.navigate(['/users/new']);
  }

  // ============ HELPERS ============
  isUserDeleted(user: User): boolean {
    return user.deletedAt !== null && user.deletedAt !== undefined;
  }

  getUserFullName(user: User): string {
    const parts = [user.firstName, user.lastName].filter((p) => p);
    return parts.length > 0 ? parts.join(' ') : '-';
  }

  // ============ SNACKBAR CUSTOM ============
  private showSnackbar(
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
  ): void {
    // Créer et afficher un snackbar custom
    const snackbar = document.createElement('div');
    snackbar.className = `custom-snackbar snackbar-${type}`;
    snackbar.textContent = message;
    document.body.appendChild(snackbar);

    // Animation d'entrée
    setTimeout(() => snackbar.classList.add('show'), 10);

    // Retirer après 3 secondes
    if (this.snackbarTimeout) {
      clearTimeout(this.snackbarTimeout);
    }

    this.snackbarTimeout = setTimeout(() => {
      snackbar.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(snackbar)) {
          document.body.removeChild(snackbar);
        }
      }, 300);
    }, 3000);
  }
}
