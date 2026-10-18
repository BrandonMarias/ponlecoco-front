import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiCacheService } from '../shared/api-cache.service';

interface User {
  id: string;
  email: string;
  name: string;
  photoUrl?: string;
  role: string;
  googleId?: string;
}

interface AuthResponse {
  user: User;
  access_token?: string;
  accessToken?: string;
  token?: string;
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
  private apiCache = inject(ApiCacheService);
  private apiUrl = environment.apiUrl;

  private authState = signal<AuthState>({ user: null, isAuthenticated: false });

  currentUser = computed(() => this.authState().user);
  isAuthenticated = computed(() => this.authState().isAuthenticated);
  isGoogleUser = computed(() => !!this.authState().user?.googleId);

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
        const token = this.extractToken(response);
        this.setAuthState(response.user, token);
      }),
      catchError((error: HttpErrorResponse) => {
        // Only a real 401 invalidates the session; network/server errors keep the restored one
        if (error.status === 401) {
          this.clearAuthState();
        }
        return of(null);
      })
    );
  }

  login(credentials: { email: string, password: string }) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }).pipe(
      tap(response => {
        const token = this.extractToken(response);
        this.setAuthState(response.user, token);
      })
    );
  }

  googleLogin(token: string) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/google`, { token }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }).pipe(
      tap(response => {
        const token = this.extractToken(response);
        this.setAuthState(response.user, token);
      })
    );
  }

  register(credentials: { name: string, email: string, password: string }) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/users`, credentials, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  verifyEmail(token: string) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/users/verify-email`, { token }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }).pipe(
      tap(response => {
        const accessToken = this.extractToken(response);
        this.setAuthState(response.user, accessToken);
      })
    );
  }

  resendVerificationCode(email: string) {
    return this.http.post(`${this.apiUrl}/users/resend-verification`, { email }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  forgotPassword(email: string) {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.post(`${this.apiUrl}/auth/reset-password`, { token, newPassword }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  logout() {
    this.clearAuthState();
    this.router.navigateByUrl('/auth/login');
  }

  updateUserProfile(updates: Partial<User>) {
    const currentUser = this.authState().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      this.authState.set({ user: updatedUser, isAuthenticated: true });
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
    }
  }

  private clearAuthState() {
    this.authState.set({ user: null, isAuthenticated: false });
    localStorage.removeItem('user_data');
    localStorage.removeItem('access_token');
    this.apiCache.clear();
  }

  private extractToken(response: AuthResponse): string {
    const token = response.access_token || response.accessToken || response.token;
    if (!token) {
      console.error('No token found in response:', response);
      throw new Error('No authentication token received');
    }
    return token;
  }

  private setAuthState(user: User, accessToken: string) {
    this.authState.set({ user, isAuthenticated: true });
    localStorage.setItem('user_data', JSON.stringify(user));
    localStorage.setItem('access_token', accessToken);
  }
}
