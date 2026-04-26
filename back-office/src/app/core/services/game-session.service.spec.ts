import { TestBed } from '@angular/core/testing';
import { GameSessionService } from './game-session.service';
import { ApiService } from './api.service';
import { of, throwError } from 'rxjs';
import {
  GameSession,
  UpdateGameSessionDto,
} from '../models/game-session.model';

describe('GameSessionService', () => {
  let service: GameSessionService;
  let apiService: jasmine.SpyObj<ApiService>;

  const mockSession: GameSession = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    gameId: 1,
    status: 'active',
    players: [
      {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'playing',
        score: 1500,
        expGained: 120,
        rank: 1,
      },
    ],
    gameData: { currentRound: 3, maxRounds: 10 },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockSessions: GameSession[] = [
    mockSession,
    {
      ...mockSession,
      id: '123e4567-e89b-12d3-a456-426614174002',
      status: 'completed',
    },
  ];

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('ApiService', [
      'get',
      'post',
      'patch',
      'delete',
    ]);

    TestBed.configureTestingModule({
      providers: [
        GameSessionService,
        { provide: ApiService, useValue: apiSpy },
      ],
    });

    service = TestBed.inject(GameSessionService);
    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getGameSessions', () => {
    it('should fetch all game sessions', (done) => {
      apiService.get.and.returnValue(of({ gameSessions: mockSessions }));

      service.getGameSessions().subscribe({
        next: (sessions) => {
          expect(sessions).toEqual(mockSessions);
          expect(apiService.get).toHaveBeenCalledWith('/game-sessions');
          done();
        },
      });
    });

    it('should return empty array when no sessions', (done) => {
      apiService.get.and.returnValue(of({ gameSessions: [] }));

      service.getGameSessions().subscribe({
        next: (sessions) => {
          expect(sessions).toEqual([]);
          done();
        },
      });
    });

    it('should handle errors when fetching sessions', (done) => {
      const error = new Error('Network error');
      apiService.get.and.returnValue(throwError(() => error));

      service.getGameSessions().subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('getGameSessionById', () => {
    it('should fetch a session by id', (done) => {
      apiService.get.and.returnValue(of({ gameSession: mockSession }));

      service.getGameSessionById(mockSession.id).subscribe({
        next: (session) => {
          expect(session).toEqual(mockSession);
          expect(apiService.get).toHaveBeenCalledWith(
            `/game-sessions/${mockSession.id}`,
          );
          done();
        },
      });
    });

    it('should handle errors when fetching session by id', (done) => {
      const error = new Error('Not found');
      apiService.get.and.returnValue(throwError(() => error));

      service.getGameSessionById('missing').subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('updateGameSession', () => {
    it('should update session status', (done) => {
      const dto: UpdateGameSessionDto = { status: 'completed' };
      const updated: GameSession = { ...mockSession, status: 'completed' };
      apiService.patch.and.returnValue(of(updated));

      service.updateGameSession(mockSession.id, dto).subscribe({
        next: (session) => {
          expect(session.status).toBe('completed');
          expect(apiService.patch).toHaveBeenCalledWith(
            `/game-sessions/${mockSession.id}`,
            dto,
          );
          done();
        },
      });
    });

    it('should handle errors when updating session', (done) => {
      const error = new Error('Update failed');
      apiService.patch.and.returnValue(throwError(() => error));

      service
        .updateGameSession(mockSession.id, { status: 'canceled' })
        .subscribe({
          error: (err) => {
            expect(err).toBe(error);
            done();
          },
        });
    });
  });

  describe('deleteGameSession', () => {
    it('should delete a session', (done) => {
      apiService.delete.and.returnValue(of(undefined));

      service.deleteGameSession(mockSession.id).subscribe({
        next: () => {
          expect(apiService.delete).toHaveBeenCalledWith(
            `/game-sessions/${mockSession.id}`,
          );
          done();
        },
      });
    });

    it('should handle errors when deleting session', (done) => {
      const error = new Error('Delete failed');
      apiService.delete.and.returnValue(throwError(() => error));

      service.deleteGameSession(mockSession.id).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });
});
