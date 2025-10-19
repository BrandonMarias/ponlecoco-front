import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { AuthService } from './auth/auth.service';

// Factory function for the APP_INITIALIZER
export function initializeAuth(authService: AuthService): () => Observable<any> {
  return () => {
    return authService.refreshTokenOnLoad().pipe(
      catchError((error) => {
        console.log('⚠️ App initializer failed, continuing startup:', error);
        return of(null);
      })
    );
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),

    // APP_INITIALIZER para mantener la sesión activa al recargar
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
};
