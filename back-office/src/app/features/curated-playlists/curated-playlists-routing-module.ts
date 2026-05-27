import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CuratedPlaylistsList } from './pages/curated-playlists-list/curated-playlists-list';
import { CuratedPlaylistDetail } from './pages/curated-playlist-detail/curated-playlist-detail';

const routes: Routes = [
  {
    path: '',
    component: CuratedPlaylistsList,
  },
  {
    path: ':id',
    component: CuratedPlaylistDetail,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CuratedPlaylistsRoutingModule {}
