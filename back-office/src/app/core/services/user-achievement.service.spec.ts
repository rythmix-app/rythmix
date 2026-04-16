import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UserAchievementService } from './user-achievement.service';
import { ApiService } from './api.service';
import { UserAchievement } from '../models/user-achievement.model';

describe('UserAchievementService', () => {
  let service: UserAchievementService;
  let apiService: jasmine.SpyObj<ApiService>;

  const mockAchievement = {
    id: 1,
    name: 'Première victoire',
    description: 'Gagner sa première partie.',
    type: 'first_win',
    icon: '🥇',
  };

  const mockUserAchievements: UserAchievement[] = [
    {
      id: 'ua-1',
      userId: 'user-alice',
      achievementId: 1,
      currentProgress: 1,
      requiredProgress: 1,
      currentTier: 1,
      progressData: {},
      unlockedAt: '2024-03-01T10:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-03-01T10:00:00.000Z',
      achievement: mockAchievement,
    },
    {
      id: 'ua-2',
      userId: 'user-alice',
      achievementId: 2,
      currentProgress: 23,
      requiredProgress: 50,
      currentTier: 1,
      progressData: {},
      unlockedAt: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-15T00:00:00.000Z',
      achievement: {
        id: 2,
        name: 'Vétéran',
        description: null,
        type: 'games_played',
        icon: '🏆',
      },
    },
    {
      id: 'ua-3',
      userId: 'user-bob',
      achievementId: 1,
      currentProgress: 1,
      requiredProgress: 1,
      currentTier: 1,
      progressData: {},
      unlockedAt: '2024-02-10T08:00:00.000Z',
      createdAt: '2024-02-01T00:00:00.000Z',
      updatedAt: '2024-02-10T08:00:00.000Z',
      achievement: mockAchievement,
    },
  ];

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('ApiService', ['get']);

    TestBed.configureTestingModule({
      providers: [
        UserAchievementService,
        { provide: ApiService, useValue: apiSpy },
      ],
    });

    service = TestBed.inject(UserAchievementService);
    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getByUserId', () => {
    it('should return only achievements belonging to the given userId', (done) => {
      apiService.get.and.returnValue(
        of({ userAchievements: mockUserAchievements }),
      );

      service.getByUserId('user-alice').subscribe({
        next: (results) => {
          expect(results.length).toBe(2);
          results.forEach((ua) => expect(ua.userId).toBe('user-alice'));
          done();
        },
      });
    });

    it('should return empty array when user has no achievements', (done) => {
      apiService.get.and.returnValue(
        of({ userAchievements: mockUserAchievements }),
      );

      service.getByUserId('user-unknown').subscribe({
        next: (results) => {
          expect(results).toEqual([]);
          done();
        },
      });
    });

    it('should call the correct endpoint', (done) => {
      apiService.get.and.returnValue(of({ userAchievements: [] }));

      service.getByUserId('user-alice').subscribe({
        next: () => {
          expect(apiService.get).toHaveBeenCalledWith('/user-achievements');
          done();
        },
      });
    });

    it('should return empty array when API returns no achievements', (done) => {
      apiService.get.and.returnValue(of({ userAchievements: [] }));

      service.getByUserId('user-alice').subscribe({
        next: (results) => {
          expect(results).toEqual([]);
          done();
        },
      });
    });

    it('should propagate API errors', (done) => {
      const error = new Error('Forbidden');
      apiService.get.and.returnValue(throwError(() => error));

      service.getByUserId('user-alice').subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });
});
