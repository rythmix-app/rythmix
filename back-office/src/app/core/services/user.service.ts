import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { User, CreateUserDto, UpdateUserDto, UserFilters } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private endpoint = '/users';

  constructor(private api: ApiService) {}

  getUsers(filters?: UserFilters): Observable<User[]> {
    return this.api.get<User[]>(this.endpoint, filters);
  }

  getUserById(id: string): Observable<User> {
    return this.api.get<User>(`${this.endpoint}/${id}`);
  }

  createUser(user: CreateUserDto): Observable<User> {
    return this.api.post<User>(this.endpoint, user);
  }

  updateUser(id: string, user: UpdateUserDto): Observable<User> {
    return this.api.put<User>(`${this.endpoint}/${id}`, user);
  }

  deleteUser(id: string): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}`);
  }

  restoreUser(id: string): Observable<User> {
    return this.api.post<User>(`${this.endpoint}/${id}/restore`, {});
  }

  permanentDeleteUser(id: string): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}/permanent`);
  }
}
