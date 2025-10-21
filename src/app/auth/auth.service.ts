import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
    // Check if user data exists in localStorage (for UI optimization only)
    // We'll validate the actual session with refreshTokenOnLoad()
    const storedUser = localStorage.getItem('user_data');
    if (storedUser) {
      this.authState.set({
        user: JSON.parse(storedUser),
        isAuthenticated: false // Will be set to true only after session validation
      });
    } else {
      console.log('🚫 No stored user data found');
    }
  }

  refreshTokenOnLoad(): Observable<any> {
    // Since we're using httpOnly cookies, we just try to validate the session
    return this.http.get<AuthResponse>(`${this.apiUrl}/auth/refresh`, {
      withCredentials: true
    }).pipe(
      tap(response => {
        this.setAuthState({ user: response.user, isAuthenticated: true });
      }),
      catchError(() => {
        // Clear local state without redirecting (since this is app initialization)
        this.clearAuthState();
        return of(null);
      })
    );
  }

  login(credentials: { email: string, password: string }) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials, {
      withCredentials: true
    }).pipe(
      tap(response => this.setAuthState({ user: response.user, isAuthenticated: true }))
    );
  }

  googleLogin(token: string) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/google`, { token }, {
      withCredentials: true
    }).pipe(
      tap(response => this.setAuthState({ user: response.user, isAuthenticated: true }))
    );
  }

  register(credentials: { name: string, email: string, password: string }) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/users`, credentials, {
      withCredentials: true
    }).pipe(
      tap(response => this.setAuthState({ user: response.user, isAuthenticated: true }))
    );
  }

  logout() {
    // Call the logout endpoint to clear the httpOnly cookie
    this.http.post(`${this.apiUrl}/auth/logout`, {}, {
      withCredentials: true
    }).subscribe({
      next: () => {
        console.log('Logout successful, cookie cleared');
      },
      error: (error) => {
        console.error('Error during logout:', error);
      },
      complete: () => {
        // Clear local state and redirect to login
        this.clearAuthState();
        this.router.navigateByUrl('/auth/login');
      }
    });
  }

  private clearAuthState() {
    this.setAuthState({ user: null, isAuthenticated: false });
  }

  private setAuthState(state: AuthState) {
    this.authState.set(state);
    if (state.isAuthenticated && state.user) {
      // Store only user data (not tokens) for UI state persistence
      localStorage.setItem('user_data', JSON.stringify(state.user));
    } else {
      localStorage.removeItem('user_data');
    }
  }
}
