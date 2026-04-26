import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth-guard';
import { LoginComponent } from './features/auth/login/login';
import { RegisterComponent } from './features/auth/register/register';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard-module').then(
        (m) => m.DashboardModule,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'users',
    loadChildren: () =>
      import('./features/users/users-module').then((m) => m.UsersModule),
    canActivate: [authGuard],
  },
  {
    path: 'achievements',
    loadChildren: () =>
      import('./features/achievements/achievements-module').then(
        (m) => m.AchievementsModule,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'games',
    loadChildren: () =>
      import('./features/games/games-module').then((m) => m.GamesModule),
    canActivate: [authGuard],
  },
  {
    path: 'sessions',
    loadChildren: () =>
      import('./features/game-sessions/game-sessions-module').then(
        (m) => m.GameSessionsModule,
      ),
    canActivate: [authGuard],
  },
];
