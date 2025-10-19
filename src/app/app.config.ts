import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
// Temporarily disable social auth imports
// import {
//   GoogleLoginProvider,
//   SocialAuthServiceConfig,
//   SocialAuthService,
//   SOCIAL_AUTH_SERVICE_CONFIG
// } from '@abacritt/angularx-social-login';

import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { AuthService } from './auth/auth.service';
// import { environment } from '../environments/environment'; // Temporarily disabled

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

    // Temporarily disable Social Auth to test if app loads
    // We'll fix this once the basic app is working
    /*
    SocialAuthService,
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(environment.googleClientId),
          },
        ],
        onError: (err: any) => {
          console.error('Social Auth Error:', err);
        },
      } as SocialAuthServiceConfig,
    },
    */

    // Also temporarily comment out APP_INITIALIZER
    /*
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true,
    },
    */
  ],
};
