import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environnements/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get<T>(endpoint: string, params?: any): Observable<T> {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }

    return this.http.get<any>(`${this.baseUrl}${endpoint}`, { params: httpParams }).pipe(
      map(response => response.data || response) // Extrait 'data' si présent
    );
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<any>(`${this.baseUrl}${endpoint}`, body).pipe(
      map(response => response.data || response)
    );
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<any>(`${this.baseUrl}${endpoint}`, body).pipe(
      map(response => response.data || response)
    );
  }

  patch<T>(endpoint: string, body: any): Observable<T> {
    return this.http.patch<any>(`${this.baseUrl}${endpoint}`, body).pipe(
      map(response => response.data || response)
    );
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<any>(`${this.baseUrl}${endpoint}`).pipe(
      map(response => response.data || response)
    );
  }
}
