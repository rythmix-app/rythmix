import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { LikedTrack } from '../models/liked-track.model';

@Injectable({
  providedIn: 'root',
})
export class LikedTrackService {
  private api = inject(ApiService);

  getByUserId(userId: string): Observable<LikedTrack[]> {
    return this.api
      .get<{ likedTracks: LikedTrack[] }>('/liked-tracks')
      .pipe(map((r) => r.likedTracks.filter((t) => t.userId === userId)));
  }

  deleteLikedTrack(id: number): Observable<void> {
    return this.api.delete<void>(`/liked-tracks/${id}`);
  }
}
