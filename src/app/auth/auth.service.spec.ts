import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService startup refresh', () => {
  const user = { id: 'u1', email: 'a@b.c', name: 'A', role: 'user' };
  let http: HttpTestingController;

  function setup() {
    localStorage.setItem('user_data', JSON.stringify(user));
    localStorage.setItem('access_token', 'old-token');
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  afterEach(() => localStorage.clear());

  it('restores the session synchronously, before the refresh answers', () => {
    const auth = setup();
    auth.refreshTokenOnLoad().subscribe();

    expect(auth.isAuthenticated()).toBeTrue();
    http.expectOne(`${environment.apiUrl}/auth/refresh`);
  });

  it('keeps the session on network / server errors', () => {
    const auth = setup();
    auth.refreshTokenOnLoad().subscribe();
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush('down', { status: 503, statusText: 'Unavailable' });

    expect(auth.isAuthenticated()).toBeTrue();
    expect(localStorage.getItem('access_token')).toBe('old-token');
  });

  it('clears the session on a real 401', () => {
    const auth = setup();
    auth.refreshTokenOnLoad().subscribe();
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush('nope', { status: 401, statusText: 'Unauthorized' });

    expect(auth.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('updates the stored token when the refresh succeeds', () => {
    const auth = setup();
    auth.refreshTokenOnLoad().subscribe();
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush({ user, access_token: 'new-token' });

    expect(localStorage.getItem('access_token')).toBe('new-token');
    expect(auth.isAuthenticated()).toBeTrue();
  });
});
