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
        clientId: environment.googleClientId,
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      }).catch((error) => {
        console.error('Failed to initialize native Google Auth:', error);
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
          console.error('Google login failed:', err);
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

      // Limpiar sesión previa
      try {
        await GoogleAuth.signOut();
      } catch (signOutError) {
        // Ignorar errores de signOut
      }

      const result = await GoogleAuth.signIn();
      const idToken = result.authentication?.idToken || (result as any).idToken;

      if (idToken) {
        this.authService.googleLogin(idToken).pipe(
          finalize(() => this.loading.set(false))
        ).subscribe({
          next: () => this.router.navigateByUrl('/dashboard'),
          error: (err) => {
            console.error('Backend login failed:', err);
            this.error.set(err.error?.message || 'Error en el inicio de sesión con Google. Por favor, inténtalo de nuevo.');
          }
        });
      } else {
        this.loading.set(false);
        this.error.set('No se pudo obtener el token de Google');
      }
    } catch (error: any) {
      this.loading.set(false);
      console.error('Native Google Auth error:', error);

      let errorMessage = 'Error al iniciar sesión con Google';

      switch (error.code) {
        case '10':
          errorMessage = 'Error de configuración de Google. Verifica que la app esté correctamente configurada en Google Console.';
          break;
        case '12501':
          errorMessage = 'Inicio de sesión cancelado por el usuario.';
          break;
        case '7':
          errorMessage = 'Error de red. Verifica tu conexión a internet.';
          break;
        default:
          errorMessage = `Error al iniciar sesión con Google: ${error.message || 'Error desconocido'}`;
      }

      this.error.set(errorMessage);
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

    this.performLogin(credentials);
  }

  private performLogin(credentials: { email: string, password: string }) {
    this.authService.login(credentials)
      .pipe(
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => this.router.navigateByUrl('/dashboard'),
        error: (err) => {
          console.error('Login failed:', err);
          console.log('Error status:', err.status);
          console.log('Error message:', err.error?.message);

          // Verificar si la cuenta no está verificada
          if (err.status === 401 && err.error?.message && (
              err.error.message.toLowerCase().includes('verify your email') ||
              err.error.message.toLowerCase().includes('not verified') ||
              err.error.message.toLowerCase().includes('email not verified') ||
              err.error.message.toLowerCase().includes('account not verified') ||
              err.error?.code === 'EMAIL_NOT_VERIFIED')) {

            console.log('Account not verified for:', credentials.email);
            // Mostrar mensaje específico para cuentas no verificadas
            this.error.set('Tu cuenta necesita ser verificada antes de poder iniciar sesión. Por favor, revisa tu email y haz clic en el enlace de verificación que te enviamos.');
            return;
          }          let errorMessage = 'Error en el inicio de sesión. Por favor, inténtalo de nuevo.';

          if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
            errorMessage = `Error de conectividad: No se puede conectar al servidor. Verifica tu conexión a internet.`;
          } else if (err.status === 0) {
            errorMessage = `Error de red: No se puede conectar al servidor. Verifica la configuración de red.`;
          } else if (err.error?.message) {
            errorMessage = err.error.message;
          }

          this.error.set(errorMessage);
        }
      });
  }
}
