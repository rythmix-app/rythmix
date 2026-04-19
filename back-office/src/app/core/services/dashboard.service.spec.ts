import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DashboardService } from './dashboard.service';
import { ApiService } from './api.service';
import { User } from '../models/user.model';

describe('DashboardService', () => {
  let service: DashboardService;
  let apiService: jasmine.SpyObj<ApiService>;

  const makeUser = (overrides: Partial<User> = {}): User => ({
    id: 'u-1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  });

  const activeUser = makeUser({ id: 'u-1', role: 'user', deletedAt: null });
  const adminUser = makeUser({ id: 'u-2', role: 'admin', deletedAt: null });
  const deletedUser = makeUser({
    id: 'u-3',
    role: 'user',
    deletedAt: new Date(),
  });

  const mockSessions = [
    { id: 's-1', status: 'completed', gameId: 1, createdAt: '2024-01-01' },
    { id: 's-2', status: 'completed', gameId: 1, createdAt: '2024-01-02' },
    { id: 's-3', status: 'active', gameId: 2, createdAt: '2024-01-03' },
    { id: 's-4', status: 'pending', gameId: 2, createdAt: '2024-01-04' },
    { id: 's-5', status: 'canceled', gameId: 3, createdAt: '2024-01-05' },
  ];

  const mockAchievements = [{ id: 1 }, { id: 2 }, { id: 3 }];

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('ApiService', ['get']);

    TestBed.configureTestingModule({
      providers: [DashboardService, { provide: ApiService, useValue: apiSpy }],
    });

    service = TestBed.inject(DashboardService);
    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getStats', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiService.get.and.callFake((endpoint: string): any => {
        if (endpoint === '/users')
          return of({ users: [activeUser, adminUser, deletedUser] });
        if (endpoint === '/game-sessions')
          return of({ gameSessions: mockSessions });
        if (endpoint === '/achievements')
          return of({ achievements: mockAchievements });
        return of({});
      });
    });

    it('should return correct total user count', (done) => {
      service.getStats().subscribe({
        next: (stats) => {
          expect(stats.users.total).toBe(3);
          done();
        },
      });
    });

    it('should count active users (no deletedAt)', (done) => {
      service.getStats().subscribe({
        next: (stats) => {
          expect(stats.users.active).toBe(2);
          done();
        },
      });
    });

    it('should count deleted users', (done) => {
      service.getStats().subscribe({
        next: (stats) => {
          expect(stats.users.deleted).toBe(1);
          done();
        },
      });
    });

    it('should count admin users', (done) => {
      service.getStats().subscribe({
        next: (stats) => {
          expect(stats.users.admins).toBe(1);
          done();
        },
      });
    });

    it('should return up to 5 recent non-deleted users sorted by createdAt desc', (done) => {
      const users = Array.from({ length: 7 }, (_, i) =>
        makeUser({
          id: `u-${i}`,
          deletedAt: null,
          createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
        }),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiService.get.and.callFake((endpoint: string): any => {
        if (endpoint === '/users') return of({ users });
        if (endpoint === '/game-sessions') return of({ gameSessions: [] });
        if (endpoint === '/achievements') return of({ achievements: [] });
        return of({});
      });

      service.getStats().subscribe({
        next: (stats) => {
          expect(stats.users.recent.length).toBe(5);
          // Most recent first
          const dates = stats.users.recent.map((u) => u.createdAt.valueOf());
          expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
          done();
        },
      });
    });

    it('should not include deleted users in recent list', (done) => {
      service.getStats().subscribe({
        next: (stats) => {
          stats.users.recent.forEach((u) => expect(u.deletedAt).toBeNull());
          done();
        },
      });
    });

    it('should count total sessions', (done) => {
      service.getStats().subscribe({
        next: (stats) => {
          expect(stats.sessions.total).toBe(5);
          done();
        },
      });
    });

    it('should count sessions by status', (done) => {
      service.getStats().subscribe({
        next: (stats) => {
          expect(stats.sessions.completed).toBe(2);
          expect(stats.sessions.active).toBe(1);
          expect(stats.sessions.pending).toBe(1);
          expect(stats.sessions.canceled).toBe(1);
          done();
        },
      });
    });

    it('should return zero for all session statuses when empty', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiService.get.and.callFake((endpoint: string): any => {
        if (endpoint === '/users') return of({ users: [] });
        if (endpoint === '/game-sessions') return of({ gameSessions: [] });
        if (endpoint === '/achievements') return of({ achievements: [] });
        return of({});
      });

      service.getStats().subscribe({
        next: (stats) => {
          expect(stats.sessions.total).toBe(0);
          expect(stats.sessions.completed).toBe(0);
          expect(stats.sessions.active).toBe(0);
          expect(stats.sessions.pending).toBe(0);
          expect(stats.sessions.canceled).toBe(0);
          done();
        },
      });
    });

    it('should return correct achievements total', (done) => {
      service.getStats().subscribe({
        next: (stats) => {
          expect(stats.achievements.total).toBe(3);
          done();
        },
      });
    });

    it('should propagate error if any API call fails', (done) => {
      const error = new Error('Network error');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiService.get.and.callFake((endpoint: string): any => {
        if (endpoint === '/users') return throwError(() => error);
        return of({});
      });

      service.getStats().subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });
});
