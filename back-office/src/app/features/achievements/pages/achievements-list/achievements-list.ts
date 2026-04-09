import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Achievement } from '../../../../core/models/achievement.model';
import { AchievementService } from '../../../../core/services/achievement.service';

@Component({
  standalone: false,
  selector: 'app-achievements-list',
  templateUrl: './achievements-list.html',
  styleUrls: ['./achievements-list.scss'],
})
export class AchievementsList implements OnInit {
  allAchievements: Achievement[] = [];
  filteredAchievements: Achievement[] = [];
  paginatedAchievements: Achievement[] = [];

  isLoading = false;

  achievementService = inject(AchievementService);
  router = inject(Router);

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;

  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  private snackbarTimeout: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.loadAchievements();
  }

  loadAchievements(): void {
    this.isLoading = true;
    this.achievementService.getAchievements().subscribe({
      next: (achievements) => {
        this.allAchievements = achievements;
        this.filteredAchievements = [...achievements];
        this.currentPage = 0;
        this.updatePagination();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading achievements:', error);
        this.showSnackbar('Erreur lors du chargement des succès', 'error');
        this.isLoading = false;
      },
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value
      .toLowerCase()
      .trim();

    if (!filterValue) {
      this.filteredAchievements = [...this.allAchievements];
    } else {
      this.filteredAchievements = this.allAchievements.filter(
        (a) =>
          a.name.toLowerCase().includes(filterValue) ||
          a.type.toLowerCase().includes(filterValue) ||
          (a.description && a.description.toLowerCase().includes(filterValue)),
      );
    }

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

    this.filteredAchievements.sort((a, b) => {
      let aValue: string | number | Date | null | undefined =
        a[column as keyof Achievement];
      let bValue: string | number | Date | null | undefined =
        b[column as keyof Achievement];

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

  updatePagination(): void {
    const data = this.filteredAchievements;
    this.totalPages = Math.ceil(data.length / this.pageSize);

    if (this.currentPage >= this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages - 1;
    }

    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedAchievements = data.slice(start, end);
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
    const data = this.filteredAchievements;
    if (data.length === 0) return '0 sur 0';

    const start = this.currentPage * this.pageSize + 1;
    const end = Math.min((this.currentPage + 1) * this.pageSize, data.length);
    return `${start} - ${end} sur ${data.length}`;
  }

  viewAchievement(achievement: Achievement): void {
    this.router.navigate(['/achievements', achievement.id]);
  }

  editAchievement(achievement: Achievement): void {
    this.router.navigate(['/achievements', achievement.id, 'edit']);
  }

  deleteAchievement(achievement: Achievement): void {
    if (
      confirm(
        `Êtes-vous sûr de vouloir supprimer le succès "${achievement.name}" ?`,
      )
    ) {
      this.achievementService.deleteAchievement(achievement.id).subscribe({
        next: () => {
          this.showSnackbar('Succès supprimé avec succès', 'success');
          this.loadAchievements();
        },
        error: (error) => {
          console.error('Error deleting achievement:', error);
          const errorMessage =
            error.error?.message || 'Erreur lors de la suppression';
          this.showSnackbar(errorMessage, 'error');
        },
      });
    }
  }

  createAchievement(): void {
    this.router.navigate(['/achievements/new']);
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
          document.body.removeChild(snackbar);
        }
      }, 300);
    }, 3000);
  }
}
