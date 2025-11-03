import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // Add JWT token to requests if user is authenticated
  if (token) {
    // Don't set Content-Type for FormData requests (file uploads)
    // The browser will automatically set the correct Content-Type with boundary
    if (req.body instanceof FormData) {
      const cloned = req.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });
      return next(cloned).pipe(
        catchError((error: HttpErrorResponse) => handleAuthError(error, authService, router, req))
      );
    }

    // For other requests, set JSON content type and Authorization header
    const cloned = req.clone({
      setHeaders: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return next(cloned).pipe(
      catchError((error: HttpErrorResponse) => handleAuthError(error, authService, router, req))
    );
  }

  // For unauthenticated requests, just set Content-Type if it's not FormData
  if (!(req.body instanceof FormData)) {
    const cloned = req.clone({
      setHeaders: {
        'Content-Type': 'application/json'
      }
    });
    return next(cloned);
  }

  return next(req);
};

function handleAuthError(error: HttpErrorResponse, authService: AuthService, router: Router, req: any) {
  // Check if it's a 401 error from the refresh endpoint or any authenticated endpoint
  if (error.status === 401) {
    const isRefreshEndpoint = req.url.includes('/auth/refresh');

    if (isRefreshEndpoint || authService.getToken()) {
      // Session expired - clear auth and redirect to login
      authService.logout();

      // Show toast notification
      showSessionExpiredToast();

      // Redirect to login
      router.navigate(['/auth/login'], {
        queryParams: { expired: 'true' }
      });
    }
  }

  return throwError(() => error);
}

function showSessionExpiredToast() {
  // Create and show toast notification
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl z-[9999] flex items-center gap-3 animate-slide-in-down';
  toast.innerHTML = `
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    <div>
      <p class="font-semibold">Sesión Expirada</p>
      <p class="text-sm">Por favor, inicia sesión nuevamente</p>
    </div>
  `;

  document.body.appendChild(toast);

  // Remove toast after 4 seconds
  setTimeout(() => {
    toast.classList.add('animate-fade-out');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 4000);
}
