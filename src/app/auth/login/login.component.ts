import { Component, inject, signal, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';
import { environment } from '../../../environments/environment';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { HttpClient } from '@angular/common/http';

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
  private http = inject(HttpClient);

  loading = signal(false);
  error = signal<string | null>(null);
  isNative = signal(Capacitor.isNativePlatform());

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  ngAfterViewInit() {
    console.log('🏁 ngAfterViewInit - Platform check:', {
      isNative: this.isNative(),
      platform: Capacitor.getPlatform(),
      isNativePlatform: Capacitor.isNativePlatform()
    });

    if (this.isNative()) {
      console.log('📱 Initializing native Google Auth...');
      console.log('🔧 Android Client ID:', environment.googleAndroidClientId);
      console.log('🔧 Server Client ID:', environment.googleClientId);

      // Initialize native Google Auth with more explicit configuration
      GoogleAuth.initialize({
        clientId: environment.googleClientId, // Usar el serverClientId en lugar del androidClientId
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      }).then(() => {
        console.log('✅ Native Google Auth initialized successfully');
      }).catch((error) => {
        console.error('❌ Failed to initialize native Google Auth:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      });
    } else {
      console.log('🌐 Initializing web Google Auth...');
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
      console.log('🚀 Starting native Google Sign-In...');
      console.log('📋 Configuration check:');
      console.log('   - Android Client ID:', environment.googleAndroidClientId);
      console.log('   - Server Client ID:', environment.googleClientId);
      console.log('   - App ID from Capacitor:', 'com.ponlecoco.app');

      this.loading.set(true);
      this.error.set(null);

      console.log('📱 Calling GoogleAuth.signIn()...');

      // Intentar hacer sign out primero para limpiar cualquier sesión previa
      try {
        await GoogleAuth.signOut();
        console.log('🧹 Previous session cleared');
      } catch (signOutError) {
        console.log('ℹ️ No previous session to clear:', signOutError);
      }

      const result = await GoogleAuth.signIn();
      console.log('✅ Native Google login result:', JSON.stringify(result, null, 2));

      // Verificar todas las posibles ubicaciones del token
      const idToken = result.authentication?.idToken || (result as any).idToken;
      const accessToken = result.authentication?.accessToken || (result as any).accessToken;

      console.log('🔑 ID Token:', idToken ? 'Present ✅' : 'Missing ❌');
      console.log('🔑 Access Token:', accessToken ? 'Present ✅' : 'Missing ❌');
      console.log('👤 User info:', result.email, result.name);

      if (idToken) {
        console.log('📤 Sending token to backend...');
        this.authService.googleLogin(idToken).pipe(
          finalize(() => this.loading.set(false))
        ).subscribe({
          next: (response) => {
            console.log('✅ Backend login successful:', response);
            this.router.navigateByUrl('/dashboard');
          },
          error: (err) => {
            console.error('❌ Backend login failed:', err);
            console.error('Error details:', JSON.stringify(err, null, 2));
            this.error.set(err.error?.message || 'Error en el inicio de sesión con Google. Por favor, inténtalo de nuevo.');
          }
        });
      } else {
        console.error('❌ No ID token found in result');
        this.loading.set(false);
        this.error.set('No se pudo obtener el token de Google');
      }
    } catch (error: any) {
      this.loading.set(false);
      console.error('💥 Native Google Auth error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');

      let errorMessage = 'Error al iniciar sesión con Google';

      // Mapear códigos de error comunes
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

    console.log('🔑 Attempting login with:', { email: credentials.email, apiUrl: environment.apiUrl });
    console.log('🌐 Platform info:', {
      isNative: Capacitor.isNativePlatform(),
      platform: Capacitor.getPlatform()
    });

    // Proceder directamente con el login en todas las plataformas
    this.performLogin(credentials);
  }

  private performLogin(credentials: { email: string, password: string }) {
    this.authService.login(credentials)
      .pipe(
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (response) => {
          console.log('✅ Login successful:', response);
          console.log('🔍 Checking localStorage after login:');
          console.log('   - access_token:', localStorage.getItem('access_token') ? `${localStorage.getItem('access_token')?.substring(0, 20)}...` : 'null');
          console.log('   - user_data:', localStorage.getItem('user_data'));
          this.router.navigateByUrl('/dashboard');
        },
        error: (err) => {
          console.error('❌ Login failed:', err);
          console.error('Error type:', err.name);
          console.error('Error message:', err.message);
          console.error('Error status:', err.status);
          console.error('Error statusText:', err.statusText);
          console.error('Full error object:', JSON.stringify(err, null, 2));

          let errorMessage = 'Error en el inicio de sesión. Por favor, inténtalo de nuevo.';

          if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
            errorMessage = `Error de conectividad: No se puede conectar al servidor (${environment.apiUrl}). Verifica tu conexión a internet.`;
          } else if (err.status === 0) {
            errorMessage = `Error de red: No se puede conectar al servidor (${environment.apiUrl}). Verifica la configuración de red.`;
          } else if (err.error?.message) {
            errorMessage = err.error.message;
          }

          this.error.set(errorMessage);
        }
      });
  }
}
