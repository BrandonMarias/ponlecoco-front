import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-email-verification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './email-verification.component.html'
})
export default class EmailVerificationComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  token = signal<string | null>(null);
  isLoading = signal(false);
  isResending = signal(false);
  isSuccess = signal(false);
  isTokenExpired = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  userEmail = signal<string>('');

  ngOnInit() {
    // Obtener token de los parámetros de ruta
    const token = this.route.snapshot.queryParams['code'];

    if (token) {
      this.token.set(token);
      // Decodificar el token para obtener información del usuario
      this.decodeTokenInfo(token);
    } else {
      this.showErrorMessage('Token de verificación no encontrado. Por favor, revisa tu email y haz clic en el enlace de verificación.');
    }
  }

  private decodeTokenInfo(token: string) {
    try {
      // Decodificar el payload del JWT (parte media del token)
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.email) {
        this.userEmail.set(payload.email);
      }
    } catch (error) {
      console.error('Error decoding token:', error);
      // No es crítico, solo no mostramos el email
    }
  }

  async verifyEmail() {
    if (!this.token() || this.isLoading()) return;

    this.isLoading.set(true);
    this.clearMessages();

    try {
      await this.authService.verifyEmail(this.token()!).toPromise();

      this.isSuccess.set(true);
      this.showSuccessMessage('¡Email verificado correctamente! Redirigiendo al dashboard...');

      // Redirigir al dashboard después de 3 segundos
      setTimeout(() => {
        this.router.navigateByUrl('/dashboard');
      }, 3000);

    } catch (error: any) {
      console.error('Error verifying email:', error);

      let errorMsg = 'Error al verificar el email';

      if (error?.error?.message?.includes('expired') || error?.error?.message?.includes('Invalid or expired')) {
        this.isTokenExpired.set(true);
        errorMsg = 'El enlace de verificación ha expirado.';
      } else if (error?.error?.message?.includes('Invalid')) {
        errorMsg = 'El enlace de verificación es inválido. Por favor, verifica que hayas copiado el enlace completo.';
      } else if (error?.error?.message) {
        errorMsg = error.error.message;
      }

      this.showErrorMessage(errorMsg);
    } finally {
      this.isLoading.set(false);
    }
  }

  async resendVerification() {
    if (!this.userEmail() || this.isResending()) return;

    this.isResending.set(true);
    this.clearMessages();

    try {
      await this.authService.resendVerificationCode(this.userEmail()).toPromise();

      this.showSuccessMessage('Nuevo enlace de verificación enviado. Por favor, revisa tu email.');

    } catch (error: any) {
      console.error('Error resending verification:', error);
      this.showErrorMessage(error?.error?.message || 'Error al enviar el enlace de verificación. Por favor, inténtalo de nuevo.');
    } finally {
      this.isResending.set(false);
    }
  }

  goToLogin() {
    this.router.navigateByUrl('/auth/login');
  }

  goToRegister() {
    this.router.navigateByUrl('/auth/register');
  }

  private showSuccessMessage(message: string) {
    this.successMessage.set(message);
  }

  private showErrorMessage(message: string) {
    this.errorMessage.set(message);
  }

  private clearMessages() {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }
}
