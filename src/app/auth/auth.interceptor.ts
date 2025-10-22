import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
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
      return next(cloned);
    }

    // For other requests, set JSON content type and Authorization header
    const cloned = req.clone({
      setHeaders: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return next(cloned);
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
