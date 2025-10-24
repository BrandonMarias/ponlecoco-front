import { Component, signal, inject, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-email-verification',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './email-verification.component.html'
})
export default class EmailVerificationComponent implements OnInit, OnDestroy {
  @ViewChild('codeInput') codeInput!: ElementRef<HTMLInputElement>;

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  verificationForm: FormGroup;
  email = signal<string>('');
  fromLogin = signal(false);
  isLoading = signal(false);
  isResending = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  countdown = signal(0);
  private countdownInterval?: any;

  constructor() {
    this.verificationForm = this.fb.group({
      code: ['', [
        Validators.required,
        Validators.pattern(/^\d{6}$/),
        Validators.minLength(6),
        Validators.maxLength(6)
      ]]
    });
  }

  ngOnInit() {
    // Obtener email de los parámetros de ruta
    const email = this.route.snapshot.queryParams['email'];
    const fromLogin = this.route.snapshot.queryParams['fromLogin'];

    if (email) {
      this.email.set(email);
      this.fromLogin.set(fromLogin === 'true');

      // Auto-focus en el input después de un breve delay
      setTimeout(() => {
        if (this.codeInput) {
          this.codeInput.nativeElement.focus();
        }
      }, 500);

      // Si viene del login, mostrar mensaje informativo
      if (this.fromLogin()) {
        this.showErrorMessage('Tu cuenta necesita ser verificada antes de poder iniciar sesión. Por favor, verifica tu email.');
      }
    } else {
      // Si no hay email, redirigir al registro
      this.router.navigateByUrl('/auth/register');
    }
  }

  onCodeInput(event: any) {
    let value = event.target.value.replace(/\D/g, ''); // Solo números
    if (value.length > 6) {
      value = value.substring(0, 6);
    }
    this.verificationForm.patchValue({ code: value });

    // Auto-submit cuando tenga 6 dígitos
    if (value.length === 6) {
      setTimeout(() => this.verifyEmail(), 100);
    }
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  async verifyEmail() {
    if (this.verificationForm.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.clearMessages();

    try {
      await this.authService.verifyEmail(
        this.email(),
        this.verificationForm.value.code
      ).toPromise();

      this.showSuccessMessage('¡Email verificado correctamente!');

      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => {
        this.router.navigateByUrl('/dashboard');
      }, 2000);

    } catch (error: any) {
      console.error('Error verifying email:', error);
      this.showErrorMessage(error?.error?.message || 'Código de verificación inválido');
    } finally {
      this.isLoading.set(false);
    }
  }

  async resendCode() {
    if (this.isResending() || this.countdown() > 0) return;

    this.isResending.set(true);
    this.clearMessages();

    try {
      await this.authService.resendVerificationCode(this.email()).toPromise();

      this.showSuccessMessage('Código de verificación reenviado. Revisa tu email.');
      this.startCountdown();

    } catch (error: any) {
      console.error('Error resending verification code:', error);
      this.showErrorMessage(error?.error?.message || 'Error al reenviar el código');
    } finally {
      this.isResending.set(false);
    }
  }

  private startCountdown() {
    this.countdown.set(60);
    this.countdownInterval = setInterval(() => {
      const current = this.countdown();
      if (current <= 1) {
        this.countdown.set(0);
        clearInterval(this.countdownInterval);
      } else {
        this.countdown.set(current - 1);
      }
    }, 1000);
  }

  goBack() {
    // Si viene del login, regresar al login, sino al registro
    if (this.fromLogin()) {
      this.router.navigateByUrl('/auth/login');
    } else {
      this.router.navigateByUrl('/auth/register');
    }
  }

  private showSuccessMessage(message: string) {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(null), 5000);
  }

  private showErrorMessage(message: string) {
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(null), 5000);
  }

  private clearMessages() {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }
}
