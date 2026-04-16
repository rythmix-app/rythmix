import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardOverview } from './pages/dashboard-overview/dashboard-overview';

const routes: Routes = [
  {
    path: '',
    component: DashboardOverview,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}
