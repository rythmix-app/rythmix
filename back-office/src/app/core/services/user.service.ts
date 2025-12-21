import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { User, CreateUserDto, UpdateUserDto, UserFilters } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private endpoint = '/users';
  private api = inject(ApiService);

  getUsers(filters?: UserFilters): Observable<User[]> {
    return this.api.get<{ users: User[] }>(this.endpoint, filters)
      .pipe(map(response => response.users));
  }

  getUserById(id: string): Observable<User> {
    return this.api.get<{ user: User }>(`${this.endpoint}/${id}`)
      .pipe(map(response => response.user));
  }

  createUser(user: CreateUserDto): Observable<User> {
    return this.api.post<{ user: User }>(this.endpoint, user)
      .pipe(map(response => response.user));
  }

  updateUser(id: string, user: UpdateUserDto): Observable<User> {
    return this.api.patch<{ user: User }>(`${this.endpoint}/${id}`, user)
      .pipe(map(response => response.user));
  }

  deleteUser(id: string): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}`);
  }

  restoreUser(id: string): Observable<User> {
    return this.api.post<{ user: User }>(`${this.endpoint}/${id}/restore`, {})
      .pipe(map(response => response.user));
  }

  permanentDeleteUser(id: string): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}/permanent`);
  }

  getTrashedUsers(): Observable<User[]> {
    return this.api.get<{ users: User[] }>(`${this.endpoint}/trashed`)
      .pipe(map(response => response.users));
  }
}
