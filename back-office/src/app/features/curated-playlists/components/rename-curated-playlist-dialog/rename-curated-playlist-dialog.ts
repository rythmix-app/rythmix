import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-rename-curated-playlist-dialog',
  templateUrl: './rename-curated-playlist-dialog.html',
  styleUrls: ['../dialog-shared.scss'],
})
export class RenameCuratedPlaylistDialog implements OnInit {
  @Input() initialName = '';
  @Output() cancelled = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<string>();

  name = '';
  submitted = false;

  ngOnInit(): void {
    this.name = this.initialName;
  }

  get nameError(): string | null {
    if (!this.submitted) return null;
    if (!this.name.trim()) return 'Nom requis';
    return null;
  }

  get isValid(): boolean {
    return this.name.trim() !== '';
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onConfirm(): void {
    this.submitted = true;
    if (!this.isValid) return;
    this.confirmed.emit(this.name.trim());
  }
}
