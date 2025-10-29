import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { passwordMatchValidator, passwordStrengthValidator } from '../validators';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './register.component.html',
})
export default class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  userEmail = signal<string>('');

  registerForm = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6), passwordStrengthValidator()]],
    confirmPassword: ['', Validators.required],
    acceptTerms: [false, Validators.requiredTrue]
  }, { validators: passwordMatchValidator('password', 'confirmPassword') });

  onSubmit() {
    if (this.registerForm.valid) {
      this.loading.set(true);
      this.error.set(null);
      const { username, email, password } = this.registerForm.getRawValue();

      this.authService.register({ name: username!, email: email!, password: password! })
        .pipe(
          finalize(() => this.loading.set(false))
        )
        .subscribe({
          next: () => {
            // Mostrar mensaje de éxito en lugar de redirigir
            this.success.set(true);
            this.userEmail.set(email!);
          },
          error: (err) => this.error.set(err.error.message || 'An unexpected error occurred.')
        });
    } else {
      this.registerForm.markAllAsTouched();
    }
  }

  goToLogin() {
    this.router.navigateByUrl('/auth/login');
  }
}
