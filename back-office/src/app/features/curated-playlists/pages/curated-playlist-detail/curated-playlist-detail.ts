import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  CuratedPlaylist,
  DeezerTrack,
} from '../../../../core/models/curated-playlist.model';
import { CuratedPlaylistService } from '../../../../core/services/curated-playlist.service';

@Component({
  standalone: false,
  selector: 'app-curated-playlist-detail',
  templateUrl: './curated-playlist-detail.html',
  styleUrls: ['./curated-playlist-detail.scss'],
})
export class CuratedPlaylistDetail implements OnInit {
  playlist: CuratedPlaylist | null = null;
  tracks: DeezerTrack[] = [];
  filteredTracks: DeezerTrack[] = [];

  isLoading = false;
  loadError = false;
  searchValue = '';

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(CuratedPlaylistService);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      this.router.navigate(['/curated-playlists']);
      return;
    }
    this.load(id);
  }

  load(id: number): void {
    this.isLoading = true;
    this.loadError = false;
    forkJoin({
      playlists: this.service.getPlaylists(),
      tracks: this.service.getAllTracks(id),
    }).subscribe({
      next: ({ playlists, tracks }) => {
        const found = playlists.find((p) => p.id === id) ?? null;
        this.playlist = found;
        this.tracks = tracks;
        this.filteredTracks = tracks;
        this.isLoading = false;
        if (!found) {
          this.loadError = true;
        }
      },
      error: () => {
        this.isLoading = false;
        this.loadError = true;
      },
    });
  }

  onSearch(event: Event): void {
    this.searchValue = (event.target as HTMLInputElement).value
      .toLowerCase()
      .trim();
    if (!this.searchValue) {
      this.filteredTracks = this.tracks;
      return;
    }
    this.filteredTracks = this.tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(this.searchValue) ||
        t.artist.name.toLowerCase().includes(this.searchValue) ||
        t.album.title.toLowerCase().includes(this.searchValue),
    );
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  back(): void {
    this.router.navigate(['/curated-playlists']);
  }
}
