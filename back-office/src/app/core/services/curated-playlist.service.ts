import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import {
  CuratedPlaylist,
  DeezerTrack,
  ImportCuratedPlaylistDto,
  RenameCuratedPlaylistDto,
} from '../models/curated-playlist.model';

@Injectable({
  providedIn: 'root',
})
export class CuratedPlaylistService {
  private readonly endpoint = '/games/blindtest/playlists';
  private readonly api = inject(ApiService);

  getPlaylists(): Observable<CuratedPlaylist[]> {
    return this.api
      .get<{ playlists: CuratedPlaylist[] }>(this.endpoint)
      .pipe(map((response) => response.playlists));
  }

  importPlaylist(dto: ImportCuratedPlaylistDto): Observable<CuratedPlaylist> {
    return this.api
      .post<{ playlist: CuratedPlaylist }>(this.endpoint, dto)
      .pipe(map((response) => response.playlist));
  }

  renamePlaylist(
    id: number,
    dto: RenameCuratedPlaylistDto,
  ): Observable<CuratedPlaylist> {
    return this.api
      .patch<{ playlist: CuratedPlaylist }>(`${this.endpoint}/${id}`, dto)
      .pipe(map((response) => response.playlist));
  }

  refreshPlaylist(id: number): Observable<CuratedPlaylist> {
    return this.api
      .post<{ playlist: CuratedPlaylist }>(`${this.endpoint}/${id}/refresh`, {})
      .pipe(map((response) => response.playlist));
  }

  deletePlaylist(id: number): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}`);
  }

  getAllTracks(id: number): Observable<DeezerTrack[]> {
    return this.api
      .get<{ tracks: DeezerTrack[] }>(`${this.endpoint}/${id}/all-tracks`)
      .pipe(map((response) => response.tracks));
  }
}
