import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthResponse {
  access_token: string;
  user: User;
}

interface AuthState {
  user: User | null;
  token: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  private authState = signal<AuthState>({ user: null, token: null });

  currentUser = computed(() => this.authState().user);
  currentToken = computed(() => this.authState().token);
  isAuthenticated = computed(() => !!this.authState().token);

  constructor() {
    // This synchronous load is still useful for the initial paint
    // before the APP_INITIALIZER completes.
    const storedState = localStorage.getItem('auth_state');
    if (storedState) {
      this.authState.set(JSON.parse(storedState));
    }
  }

  refreshTokenOnLoad(): Observable<any> {
    const token = this.currentToken();
    if (!token) {
      return of(null); // No token, nothing to refresh. Complete the initializer.
    }

    return this.http.get<AuthResponse>(`${this.apiUrl}/auth/refresh`).pipe(
      tap(response => {
        // If refresh is successful, update the state with the new token and user data
        console.log('Token refreshed successfully.');
        this.setAuthState({ user: response.user, token: response.access_token });
      }),
      catchError((error) => {
        // If token is invalid/expired, backend returns an error. Logout the user.
        console.log('Failed to refresh token, logging out.');
        this.logout();
        return of(null); // Complete the initializer even on error.
      })
    );
  }

  login(credentials: { email: string, password: string }) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => this.setAuthState({ user: response.user, token: response.access_token }))
    );
  }

  googleLogin(token: string) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/google`, { token }).pipe(
      tap(response => this.setAuthState({ user: response.user, token: response.access_token }))
    );
  }

  logout() {
    this.setAuthState({ user: null, token: null });
    this.router.navigateByUrl('/auth/login');
  }

  private setAuthState(state: AuthState) {
    this.authState.set(state);
    if (state.token) {
      // For a "remember me" feature, localStorage is appropriate. 
      // For higher security, consider sessionStorage which clears when the tab is closed.
      localStorage.setItem('auth_state', JSON.stringify(state));
    } else {
      localStorage.removeItem('auth_state');
    }
  }
}
