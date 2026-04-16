import { Component, inject, OnInit } from '@angular/core';
import {
  DashboardService,
  DashboardStats,
} from '../../../../core/services/dashboard.service';

@Component({
  standalone: false,
  selector: 'app-dashboard-overview',
  templateUrl: './dashboard-overview.html',
  styleUrls: ['./dashboard-overview.scss'],
})
export class DashboardOverview implements OnInit {
  stats: DashboardStats | null = null;
  isLoading = false;
  lastRefreshed: Date | null = null;

  private dashboardService = inject(DashboardService);

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.isLoading = true;
    this.dashboardService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.lastRefreshed = new Date();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
        this.isLoading = false;
      },
    });
  }

  getSessionCompletionRate(): string {
    if (!this.stats || this.stats.sessions.total === 0) return '0';
    const rate =
      (this.stats.sessions.completed / this.stats.sessions.total) * 100;
    return rate.toFixed(1);
  }

  getUserDisplayName(user: {
    firstName?: string | null;
    lastName?: string | null;
    username: string;
  }): string {
    const parts = [user.firstName, user.lastName].filter((p) => p);
    return parts.length > 0 ? parts.join(' ') : user.username;
  }
}
