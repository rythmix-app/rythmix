import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { DashboardRoutingModule } from './dashboard-routing-module';
import { DashboardOverview } from './pages/dashboard-overview/dashboard-overview';

@NgModule({
  declarations: [DashboardOverview],
  imports: [CommonModule, RouterModule, DashboardRoutingModule],
})
export class DashboardModule {}
