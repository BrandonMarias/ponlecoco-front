import { Component, inject, signal, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';
import { SocialAuthService, GoogleLoginProvider } from '@abacritt/angularx-social-login';

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
export default class LoginComponent implements OnInit, AfterViewInit {
  @ViewChild('googleSignInDiv', { static: false }) googleSignInDiv!: ElementRef;
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private socialAuthService = inject(SocialAuthService);

  loading = signal(false);
  error = signal<string | null>(null);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  ngOnInit() {
    this.socialAuthService.authState.subscribe((user) => {
      if (user && user.idToken) {
        this.loading.set(true);
        this.authService.googleLogin(user.idToken).pipe(
          finalize(() => this.loading.set(false))
        ).subscribe({
          next: () => this.router.navigateByUrl('/dashboard'),
          error: (err) => {
            console.error('Google login failed', err);
            this.error.set(err.error?.message || 'Error en el inicio de sesión con Google. Por favor, inténtalo de nuevo.');
          }
        });
      }
    });
  }

  ngAfterViewInit() {
    this.initializeGoogleSignIn();
  }

  private initializeGoogleSignIn() {
    if (typeof window !== 'undefined' && window.google) {
      window.google.accounts.id.initialize({
        client_id: '793028581863-psmf3our0ip9snb792gbfqfto465dknm.apps.googleusercontent.com',
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

  // Fallback method for manual Google Sign-In (optional)
  signInWithGoogle(): void {
    if (typeof window !== 'undefined' && window.google) {
      window.google.accounts.id.prompt();
    } else {
      // Fallback to angularx-social-login if Google Identity Services is not available
      this.socialAuthService.signIn(GoogleLoginProvider.PROVIDER_ID);
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
