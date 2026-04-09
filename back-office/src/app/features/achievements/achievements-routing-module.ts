import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AchievementsList } from './pages/achievements-list/achievements-list';
import { AchievementDetail } from './pages/achievement-detail/achievement-detail';

const routes: Routes = [
  {
    path: '',
    component: AchievementsList,
  },
  {
    path: 'new',
    component: AchievementDetail,
    data: { mode: 'create' },
  },
  {
    path: ':id',
    component: AchievementDetail,
    data: { mode: 'view' },
  },
  {
    path: ':id/edit',
    component: AchievementDetail,
    data: { mode: 'edit' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AchievementsRoutingModule {}
