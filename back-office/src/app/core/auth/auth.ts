import {inject, Injectable} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UserResponse,
  RefreshResponse,
} from './auth.models';
import { User } from '../models/user.model';
import { environment } from '../../../environnements/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly TOKEN_KEY = 'accessToken';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  http = inject(HttpClient);
  router = inject(Router);

  constructor() {
    const token = this.getAccessToken();
    if (token) {
      this.isAuthenticatedSubject.next(true);
    }
    setTimeout(() => this.checkAuthStatus(), 0);
  }

  private checkAuthStatus(): void {
    const token = this.getAccessToken();
    if (token) {
      this.loadCurrentUser().subscribe({
        error: () => {
          // Silently ignore errors during initial auth check
        },
      });
    }
  }

  /**
   * Connexion de l'utilisateur
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap((response) => {
          this.setTokens(response.accessToken, response.refreshToken);
          this.isAuthenticatedSubject.next(true);
          this.loadCurrentUser().subscribe();
        }),
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Inscription d'un nouveau compte
   */
  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http
      .post<RegisterResponse>(`${this.API_URL}/auth/register`, data)
      .pipe(
        tap((response) => {
          console.log('Registration successful:', response);
        }),
        catchError((error) => {
          console.error('Registration error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Déconnexion de l'utilisateur
   */
  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.http
        .post(`${this.API_URL}/auth/logout`, { refreshToken })
        .subscribe({
          complete: () => {
            this.clearAuthData();
          },
          error: (error: unknown) => {
            console.error('Logout error:', error);
            this.clearAuthData();
          },
        });
    } else {
      this.clearAuthData();
    }
  }

  /**
   * Rafraîchir le token d'accès
   */
  refreshToken(): Observable<RefreshResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http
      .post<RefreshResponse>(`${this.API_URL}/auth/refresh`, { refreshToken })
      .pipe(
        tap((response) => {
          this.setAccessToken(response.accessToken);
        }),
        catchError((error) => {
          this.clearAuthData();
          return throwError(() => error);
        })
      );
  }

  /**
   * Charger l'utilisateur actuel
   */
  loadCurrentUser(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.API_URL}/auth/me`).pipe(
      tap((response) => {
        this.currentUserSubject.next(response.data.user);
        this.isAuthenticatedSubject.next(true);
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }


  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  hasRole(role: 'user' | 'admin'): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }


  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  private setAccessToken(accessToken: string): void {
    localStorage.setItem(this.TOKEN_KEY, accessToken);
  }

  private clearTokens(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  private clearAuthData(): void {
    this.clearTokens();
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }
}
