import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

interface User {
  id: string;
  email: string;
  name: string;
  photoUrl?: string;
  role: string;
}

interface AuthResponse {
  user: User;
  access_token: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  private authState = signal<AuthState>({ user: null, isAuthenticated: false });

  currentUser = computed(() => this.authState().user);
  isAuthenticated = computed(() => this.authState().isAuthenticated);

  constructor() {
    const storedUser = localStorage.getItem('user_data');
    const storedToken = localStorage.getItem('access_token');

    if (storedUser && storedToken) {
      this.authState.set({
        user: JSON.parse(storedUser),
        isAuthenticated: true
      });
    }
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    if (token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });
    }
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  refreshTokenOnLoad(): Observable<any> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      this.clearAuthState();
      return of(null);
    }

    return this.http.get<AuthResponse>(`${this.apiUrl}/auth/refresh`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        this.setAuthState(response.user, response.access_token);
      }),
      catchError(() => {
        this.clearAuthState();
        return of(null);
      })
    );
  }

  login(credentials: { email: string, password: string }) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }).pipe(
      tap(response => {
        this.setAuthState(response.user, response.access_token);
      })
    );
  }

  googleLogin(token: string) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/google`, { token }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }).pipe(
      tap(response => this.setAuthState(response.user, response.access_token))
    );
  }

  register(credentials: { name: string, email: string, password: string }) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/users`, credentials, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }).pipe(
      tap(response => this.setAuthState(response.user, response.access_token))
    );
  }

  logout() {
    this.clearAuthState();
    this.router.navigateByUrl('/auth/login');
  }

  private clearAuthState() {
    this.authState.set({ user: null, isAuthenticated: false });
    localStorage.removeItem('user_data');
    localStorage.removeItem('access_token');
  }

  private setAuthState(user: User, accessToken: string) {
    this.authState.set({ user, isAuthenticated: true });
    localStorage.setItem('user_data', JSON.stringify(user));
    localStorage.setItem('access_token', accessToken);
  }
}
