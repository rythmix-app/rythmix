import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { Game } from '../models/game.model';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private readonly endpoint = '/games';
  private readonly api = inject(ApiService);

  getGames(): Observable<Game[]> {
    return this.api
      .get<{ games: Game[] }>(this.endpoint)
      .pipe(map((response) => response.games));
  }

  getGameById(id: number): Observable<Game> {
    return this.api
      .get<{ game: Game }>(`${this.endpoint}/${id}`)
      .pipe(map((response) => response.game));
  }
}
