import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GameSessionsList } from './pages/game-sessions-list/game-sessions-list';
import { GameSessionDetail } from './pages/game-session-detail/game-session-detail';

const routes: Routes = [
  {
    path: '',
    component: GameSessionsList,
  },
  {
    path: ':id',
    component: GameSessionDetail,
    data: { mode: 'view' },
  },
  {
    path: ':id/edit',
    component: GameSessionDetail,
    data: { mode: 'edit' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GameSessionsRoutingModule {}
