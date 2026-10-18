import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AiUsageService, TOO_MANY_REQUESTS_MESSAGE } from './ai-usage.service';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';

describe('AiUsageService', () => {
  let service: AiUsageService;
  let http: HttpTestingController;
  const user = signal<any>({ role: 'user' });

  beforeEach(() => {
    user.set({ role: 'user' });
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: user } },
      ],
    });
    service = TestBed.inject(AiUsageService);
    http = TestBed.inject(HttpTestingController);
  });

  it('loads usage and flags exhaustion', () => {
    service.load();
    http.expectOne(`${environment.apiUrl}/ai/usage`).flush({
      limit: 20, used: 20, remaining: 0, resetsAt: '2026-11-01T00:00:00.000Z',
    });
    expect(service.usage()?.remaining).toBe(0);
    expect(service.exhausted()).toBeTrue();
  });

  it('never reports exhaustion for admins', () => {
    user.set({ role: 'admin' });
    service.usage.set({ limit: 20, used: 20, remaining: 0, resetsAt: '' });
    expect(service.exhausted()).toBeFalse();
  });

  it('returns backend message for quota 429 and refreshes', () => {
    const message = service.handleError({
      status: 429,
      error: { message: 'Límite alcanzado', limit: 20, used: 20, resetsAt: '2026-11-01T00:00:00.000Z' },
    });
    expect(message).toBe('Límite alcanzado');
    expect(service.exhausted()).toBeTrue();
    http.expectOne(`${environment.apiUrl}/ai/usage`).flush({
      limit: 20, used: 20, remaining: 0, resetsAt: '2026-11-01T00:00:00.000Z',
    });
  });

  it('treats a throttler 429 as too many requests', () => {
    const message = service.handleError({
      status: 429,
      error: { statusCode: 429, message: 'ThrottlerException: Too Many Requests' },
    });
    expect(message).toBe(TOO_MANY_REQUESTS_MESSAGE);
    expect(service.usage()).toBeNull();
    http.expectNone(`${environment.apiUrl}/ai/usage`);
  });

  it('ignores non-429 errors', () => {
    expect(service.handleError({ status: 500, error: {} })).toBeNull();
  });
});
