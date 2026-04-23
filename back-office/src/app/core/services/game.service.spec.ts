import { TestBed } from '@angular/core/testing';
import { GameService } from './game.service';
import { ApiService } from './api.service';
import { of, throwError } from 'rxjs';
import { Game, UpdateGameDto } from '../models/game.model';

describe('GameService', () => {
  let service: GameService;
  let apiService: jasmine.SpyObj<ApiService>;

  const mockGame: Game = {
    id: 1,
    name: 'Blind Test',
    description: 'Devinez les morceaux',
    isMultiplayer: false,
    isEnabled: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockGames: Game[] = [
    mockGame,
    {
      id: 2,
      name: 'Guess the Cover',
      description: 'Devinez la pochette',
      isMultiplayer: true,
      isEnabled: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
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
      providers: [GameService, { provide: ApiService, useValue: apiSpy }],
    });

    service = TestBed.inject(GameService);
    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getGames', () => {
    it('should fetch all games', (done) => {
      apiService.get.and.returnValue(of({ games: mockGames }));

      service.getGames().subscribe({
        next: (games) => {
          expect(games).toEqual(mockGames);
          expect(apiService.get).toHaveBeenCalledWith('/games');
          done();
        },
      });
    });

    it('should return empty array when no games', (done) => {
      apiService.get.and.returnValue(of({ games: [] }));

      service.getGames().subscribe({
        next: (games) => {
          expect(games).toEqual([]);
          expect(apiService.get).toHaveBeenCalledWith('/games');
          done();
        },
      });
    });

    it('should handle errors when fetching games', (done) => {
      const error = new Error('Network error');
      apiService.get.and.returnValue(throwError(() => error));

      service.getGames().subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('getGameById', () => {
    it('should fetch a game by id', (done) => {
      apiService.get.and.returnValue(of({ game: mockGame }));

      service.getGameById(1).subscribe({
        next: (game) => {
          expect(game).toEqual(mockGame);
          expect(apiService.get).toHaveBeenCalledWith('/games/1');
          done();
        },
      });
    });

    it('should handle errors when fetching game by id', (done) => {
      const error = new Error('Game not found');
      apiService.get.and.returnValue(throwError(() => error));

      service.getGameById(999).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('updateGame', () => {
    it('should update a game with all fields', (done) => {
      const updateDto: UpdateGameDto = {
        name: 'Updated',
        description: 'Updated description',
        isEnabled: false,
      };
      const updatedGame: Game = { ...mockGame, ...updateDto };
      apiService.patch.and.returnValue(of({ game: updatedGame }));

      service.updateGame(1, updateDto).subscribe({
        next: (game) => {
          expect(game).toEqual(updatedGame);
          expect(apiService.patch).toHaveBeenCalledWith('/games/1', updateDto);
          done();
        },
      });
    });

    it('should toggle only isEnabled', (done) => {
      const updateDto: UpdateGameDto = { isEnabled: false };
      const updatedGame: Game = { ...mockGame, isEnabled: false };
      apiService.patch.and.returnValue(of({ game: updatedGame }));

      service.updateGame(1, updateDto).subscribe({
        next: (game) => {
          expect(game.isEnabled).toBeFalse();
          expect(apiService.patch).toHaveBeenCalledWith('/games/1', updateDto);
          done();
        },
      });
    });

    it('should handle errors when updating game', (done) => {
      const updateDto: UpdateGameDto = { name: 'Invalid' };
      const error = new Error('Update failed');
      apiService.patch.and.returnValue(throwError(() => error));

      service.updateGame(1, updateDto).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });
});
