import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Save the full URL path (without the hash) for redirecting after login
  const fullPath = route.url.map(segment => segment.path).join('/');
  const queryParams = route.queryParams;

  if (fullPath) {
    // Build the complete path with query params if any
    let returnUrl = '/' + fullPath;
    if (Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams(queryParams as any).toString();
      returnUrl += '?' + params;
    }
    console.log('🔒 Guardando returnUrl:', returnUrl);
    localStorage.setItem('returnUrl', returnUrl);
  }

  return router.parseUrl('/auth/login');
};
