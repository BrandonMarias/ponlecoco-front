import { Component, inject, signal, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';
import { environment } from '../../../environments/environment';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

declare global {
  interface Window {
    google: any;
  }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
})
export default class LoginComponent implements AfterViewInit {
  @ViewChild('googleSignInDiv', { static: false }) googleSignInDiv!: ElementRef;
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);
  isNative = signal(Capacitor.isNativePlatform());

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  ngAfterViewInit() {
    if (this.isNative()) {
      // Initialize native Google Auth
      GoogleAuth.initialize({
        clientId: environment.googleAndroidClientId,
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
    } else {
      // Initialize web Google Auth
      this.initializeGoogleSignIn();
    }
  }

  private initializeGoogleSignIn() {
    if (typeof window !== 'undefined' && window.google) {
      window.google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response: any) => this.handleGoogleResponse(response),
        auto_select: false,
        cancel_on_tap_outside: true
      });

      window.google.accounts.id.renderButton(
        this.googleSignInDiv.nativeElement,
        {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left'
        }
      );
    }
  }

  private handleGoogleResponse(response: any) {
    if (response.credential) {
      this.loading.set(true);
      this.authService.googleLogin(response.credential).pipe(
        finalize(() => this.loading.set(false))
      ).subscribe({
        next: () => this.router.navigateByUrl('/dashboard'),
        error: (err) => {
          console.error('Google login failed', err);
          this.error.set(err.error?.message || 'Error en el inicio de sesión con Google. Por favor, inténtalo de nuevo.');
        }
      });
    }
  }

  // Método para Google Sign-In nativo (Android/iOS)
  async signInWithGoogleNative() {
    try {
      this.loading.set(true);
      this.error.set(null);

      const result = await GoogleAuth.signIn();
      console.log('Native Google login result:', result);

      // El resultado nativo tiene una estructura diferente
      const idToken = result.authentication?.idToken;

      if (idToken) {
        this.authService.googleLogin(idToken).pipe(
          finalize(() => this.loading.set(false))
        ).subscribe({
          next: () => this.router.navigateByUrl('/dashboard'),
          error: (err) => {
            console.error('Native Google login failed', err);
            this.error.set(err.error?.message || 'Error en el inicio de sesión con Google. Por favor, inténtalo de nuevo.');
          }
        });
      } else {
        this.loading.set(false);
        this.error.set('No se pudo obtener el token de Google');
      }
    } catch (error) {
      this.loading.set(false);
      console.error('Native Google Auth error:', error);
      this.error.set('Error al iniciar sesión con Google');
    }
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const credentials = {
      email: this.loginForm.value.email!,
      password: this.loginForm.value.password!
    };

    this.authService.login(credentials)
      .pipe(
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          this.router.navigateByUrl('/dashboard');
        },
        error: (err) => {
          console.error('Login failed', err);
          this.error.set(err.error?.message || 'Error en el inicio de sesión. Por favor, inténtalo de nuevo.');
        }
      });
  }
}
