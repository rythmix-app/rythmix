import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CuratedPlaylistsRoutingModule } from './curated-playlists-routing-module';

import { CuratedPlaylistsList } from './pages/curated-playlists-list/curated-playlists-list';
import { CuratedPlaylistDetail } from './pages/curated-playlist-detail/curated-playlist-detail';
import { ImportCuratedPlaylistDialog } from './components/import-curated-playlist-dialog/import-curated-playlist-dialog';
import { RenameCuratedPlaylistDialog } from './components/rename-curated-playlist-dialog/rename-curated-playlist-dialog';
import { ConfirmDeleteCuratedPlaylistDialog } from './components/confirm-delete-curated-playlist-dialog/confirm-delete-curated-playlist-dialog';

@NgModule({
  declarations: [
    CuratedPlaylistsList,
    CuratedPlaylistDetail,
    ImportCuratedPlaylistDialog,
    RenameCuratedPlaylistDialog,
    ConfirmDeleteCuratedPlaylistDialog,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CuratedPlaylistsRoutingModule,
  ],
})
export class CuratedPlaylistsModule {}
