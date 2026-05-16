import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GamesList } from './pages/games-list/games-list';
import { GameDetail } from './pages/game-detail/game-detail';

const routes: Routes = [
  {
    path: '',
    component: GamesList,
  },
  {
    path: ':id',
    component: GameDetail,
    data: { mode: 'view' },
  },
  {
    path: ':id/edit',
    component: GameDetail,
    data: { mode: 'edit' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GamesRoutingModule {}
