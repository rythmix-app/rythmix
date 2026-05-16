import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import {
  GameSession,
  UpdateGameSessionDto,
} from '../models/game-session.model';

@Injectable({
  providedIn: 'root',
})
export class GameSessionService {
  private readonly endpoint = '/game-sessions';
  private readonly api = inject(ApiService);

  getGameSessions(): Observable<GameSession[]> {
    return this.api
      .get<{ gameSessions: GameSession[] }>(this.endpoint)
      .pipe(map((response) => response.gameSessions));
  }

  getGameSessionById(id: string): Observable<GameSession> {
    return this.api
      .get<{ gameSession: GameSession }>(`${this.endpoint}/${id}`)
      .pipe(map((response) => response.gameSession));
  }

  updateGameSession(
    id: string,
    dto: UpdateGameSessionDto,
  ): Observable<GameSession> {
    return this.api.patch<GameSession>(`${this.endpoint}/${id}`, dto);
  }

  deleteGameSession(id: string): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}`);
  }
}
