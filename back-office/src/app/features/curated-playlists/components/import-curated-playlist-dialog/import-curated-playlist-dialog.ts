import { Component, EventEmitter, Output } from '@angular/core';

const DEEZER_URL_PATTERN =
  /^(?:https?:\/\/)?(?:(?:[a-z0-9-]+\.)?deezer\.com\/(?:[a-z]{2}\/)?playlist\/\d+|api\.deezer\.com\/playlist\/\d+|link\.deezer\.com\/s\/\S+|deezer\.page\.link\/\S+)/i;

@Component({
  standalone: false,
  selector: 'app-import-curated-playlist-dialog',
  templateUrl: './import-curated-playlist-dialog.html',
  styleUrls: ['../dialog-shared.scss'],
})
export class ImportCuratedPlaylistDialog {
  @Output() cancelled = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<{ url: string; genreLabel: string }>();

  url = '';
  genreLabel = '';
  submitted = false;

  get urlError(): string | null {
    if (!this.submitted) return null;
    if (!this.url.trim()) return 'URL requise';
    if (!DEEZER_URL_PATTERN.test(this.url.trim()))
      return 'URL Deezer non reconnue';
    return null;
  }

  get genreError(): string | null {
    if (!this.submitted) return null;
    if (!this.genreLabel.trim()) return 'Genre requis';
    return null;
  }

  get isValid(): boolean {
    return (
      DEEZER_URL_PATTERN.test(this.url.trim()) && this.genreLabel.trim() !== ''
    );
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onConfirm(): void {
    this.submitted = true;
    if (!this.isValid) return;
    this.confirmed.emit({
      url: this.url.trim(),
      genreLabel: this.genreLabel.trim(),
    });
  }
}
