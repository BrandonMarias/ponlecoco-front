import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './forgot-password.component.html',
})
export default class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  forgotPasswordForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit() {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);

    const email = this.forgotPasswordForm.value.email!;

    this.authService.forgotPassword(email)
      .pipe(
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          this.success.set(true);
        },
        error: (err) => {
          console.error('Forgot password failed:', err);

          // Mostrar mensaje específico para cuentas de Google
          if (err.status === 400 && err.error?.message?.toLowerCase().includes('google')) {
            this.error.set('Esta cuenta usa inicio de sesión con Google. No es posible restablecer la contraseña.');
          } else {
            // Para cualquier otro error, mostramos el mensaje genérico de éxito por seguridad
            this.success.set(true);
          }
        }
      });
  }

  backToLogin() {
    this.router.navigateByUrl('/auth/login');
  }
}
