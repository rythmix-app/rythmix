import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { UserAchievement } from '../models/user-achievement.model';

@Injectable({
  providedIn: 'root',
})
export class UserAchievementService {
  private endpoint = '/user-achievements';
  private api = inject(ApiService);

  getByUserId(userId: string): Observable<UserAchievement[]> {
    return this.api
      .get<{ userAchievements: UserAchievement[] }>(this.endpoint)
      .pipe(
        map((response) =>
          response.userAchievements.filter((ua) => ua.userId === userId),
        ),
      );
  }
}
