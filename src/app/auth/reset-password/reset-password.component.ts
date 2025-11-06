import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';
import { passwordValidator } from '../validators';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './reset-password.component.html',
})
export default class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  token = signal<string | null>(null);
  invalidToken = signal(false);

  resetPasswordForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6), passwordValidator()]],
    confirmPassword: ['', [Validators.required]],
  }, {
    validators: this.passwordMatchValidator
  });

  ngOnInit() {
    // Obtener el token de la URL
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.token.set(token);
      } else {
        this.invalidToken.set(true);
        this.error.set('El enlace de recuperación no es válido o ha expirado.');
      }
    });
  }

  passwordMatchValidator(formGroup: any) {
    const password = formGroup.get('newPassword')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;

    if (password !== confirmPassword) {
      formGroup.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  onSubmit() {
    if (this.resetPasswordForm.invalid || !this.token()) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);

    const newPassword = this.resetPasswordForm.value.newPassword!;
    const token = this.token()!;

    this.authService.resetPassword(token, newPassword)
      .pipe(
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          this.success.set(true);
          // Redirigir al login después de 3 segundos
          setTimeout(() => {
            this.router.navigateByUrl('/auth/login');
          }, 3000);
        },
        error: (err) => {
          console.error('Reset password failed:', err);

          let errorMessage = 'Error al restablecer la contraseña. Por favor, inténtalo de nuevo.';

          if (err.status === 401) {
            errorMessage = 'El enlace de recuperación ha expirado o no es válido. Por favor, solicita uno nuevo.';
            this.invalidToken.set(true);
          } else if (err.status === 404) {
            errorMessage = 'Usuario no encontrado. Por favor, verifica tu información.';
          } else if (err.status === 400) {
            if (err.error?.message?.toLowerCase().includes('google')) {
              errorMessage = 'Esta cuenta usa inicio de sesión con Google. No es posible restablecer la contraseña.';
            } else {
              errorMessage = err.error?.message || errorMessage;
            }
          } else if (err.error?.message) {
            errorMessage = err.error.message;
          }

          this.error.set(errorMessage);
        }
      });
  }

  goToLogin() {
    this.router.navigateByUrl('/auth/login');
  }

  goToForgotPassword() {
    this.router.navigateByUrl('/auth/forgot-password');
  }

  get newPasswordControl() {
    return this.resetPasswordForm.get('newPassword');
  }

  get confirmPasswordControl() {
    return this.resetPasswordForm.get('confirmPassword');
  }
}
