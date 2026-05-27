import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-confirm-delete-curated-playlist-dialog',
  templateUrl: './confirm-delete-curated-playlist-dialog.html',
  styleUrls: ['../dialog-shared.scss'],
})
export class ConfirmDeleteCuratedPlaylistDialog {
  @Input() playlistName = '';
  @Output() cancelled = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();

  onCancel(): void {
    this.cancelled.emit();
  }

  onConfirm(): void {
    this.confirmed.emit();
  }
}
