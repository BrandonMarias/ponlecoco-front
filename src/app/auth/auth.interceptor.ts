import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const isAuthenticated = authService.isAuthenticated();

  // For httpOnly cookies, we just need to include credentials with requests
  // The browser will automatically send the cookie
  if (isAuthenticated) {
    const cloned = req.clone({
      setHeaders: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    return next(cloned);
  }

  // For unauthenticated requests, still include credentials to allow login/register
  const cloned = req.clone({
    withCredentials: true
  });

  return next(cloned);
};
