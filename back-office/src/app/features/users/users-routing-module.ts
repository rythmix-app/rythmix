import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UsersList } from './pages/users-list/users-list';
import { UserDetail } from './pages/user-detail/user-detail';

const routes: Routes = [
  {
    path: '',
    component: UsersList,
  },
  {
    path: 'new',
    component: UserDetail,
    data: { mode: 'create' },
  },
  {
    path: ':id',
    component: UserDetail,
    data: { mode: 'view' },
  },
  {
    path: ':id/edit',
    component: UserDetail,
    data: { mode: 'edit' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UsersRoutingModule {}
