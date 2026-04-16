import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { User } from '../models/user.model';

interface GameSessionRaw {
  id: string;
  status: string;
  gameId: number;
  createdAt: string;
}

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    deleted: number;
    admins: number;
    recent: User[];
  };
  sessions: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    canceled: number;
  };
  achievements: {
    total: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private api = inject(ApiService);

  getStats(): Observable<DashboardStats> {
    return forkJoin({
      users: this.api.get<{ users: User[] }>('/users', {
        includeDeleted: true,
      }),
      sessions: this.api.get<{ gameSessions: GameSessionRaw[] }>(
        '/game-sessions',
      ),
      achievements: this.api.get<{ achievements: unknown[] }>('/achievements'),
    }).pipe(
      map(({ users, sessions, achievements }) => {
        const allUsers = users.users;
        const allSessions = sessions.gameSessions;

        const recentUsers = [...allUsers]
          .filter((u) => !u.deletedAt)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, 5);

        return {
          users: {
            total: allUsers.length,
            active: allUsers.filter((u) => !u.deletedAt).length,
            deleted: allUsers.filter((u) => u.deletedAt).length,
            admins: allUsers.filter((u) => u.role === 'admin').length,
            recent: recentUsers,
          },
          sessions: {
            total: allSessions.length,
            pending: allSessions.filter((s) => s.status === 'pending').length,
            active: allSessions.filter((s) => s.status === 'active').length,
            completed: allSessions.filter((s) => s.status === 'completed')
              .length,
            canceled: allSessions.filter((s) => s.status === 'canceled').length,
          },
          achievements: {
            total: achievements.achievements.length,
          },
        };
      }),
    );
  }
}
