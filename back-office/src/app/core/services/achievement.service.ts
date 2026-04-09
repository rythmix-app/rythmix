import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import {
  Achievement,
  CreateAchievementDto,
  UpdateAchievementDto,
} from '../models/achievement.model';

@Injectable({
  providedIn: 'root',
})
export class AchievementService {
  private endpoint = '/achievements';
  private api = inject(ApiService);

  getAchievements(): Observable<Achievement[]> {
    return this.api
      .get<{ achievements: Achievement[] }>(this.endpoint)
      .pipe(map((response) => response.achievements));
  }

  getAchievementById(id: number): Observable<Achievement> {
    return this.api
      .get<{ achievement: Achievement }>(`${this.endpoint}/${id}`)
      .pipe(map((response) => response.achievement));
  }

  createAchievement(dto: CreateAchievementDto): Observable<Achievement> {
    return this.api
      .post<{ achievement: Achievement }>(this.endpoint, dto)
      .pipe(map((response) => response.achievement));
  }

  updateAchievement(
    id: number,
    dto: UpdateAchievementDto,
  ): Observable<Achievement> {
    return this.api
      .patch<{ achievement: Achievement }>(`${this.endpoint}/${id}`, dto)
      .pipe(map((response) => response.achievement));
  }

  deleteAchievement(id: number): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}`);
  }
}
