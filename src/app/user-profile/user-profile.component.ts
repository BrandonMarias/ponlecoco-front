import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../shared/header/header.component';
import { AuthService } from '../auth/auth.service';
import { UserService } from '../shared/user.service';
import { ModalService } from '../shared/modal.service';
import { ImageCompressionService } from '../shared/image-compression.service';

// Custom validator for password matching
export function passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
  const newPassword = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');

  if (!newPassword || !confirmPassword) {
    return null;
  }

  return newPassword.value === confirmPassword.value ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent],
  templateUrl: './user-profile.component.html'
})
export default class UserProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private modalService = inject(ModalService);
  private imageCompressionService = inject(ImageCompressionService);

  currentUser = this.authService.currentUser;
  isGoogleUser = this.authService.isGoogleUser;

  // Form states
  nameForm: FormGroup;
  passwordForm: FormGroup;

  // UI states
  showPasswordForm = signal(false);
  updatingName = signal(false);
  changingPassword = signal(false);
  uploadingPhoto = signal(false);
  deletingAccount = signal(false);

  // Messages
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  constructor() {
    this.nameForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
      ]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  ngOnInit() {
    // Initialize name form with current user name
    if (this.currentUser()?.name) {
      this.nameForm.patchValue({ name: this.currentUser()!.name });
    }
  }

  goBack() {
    this.router.navigateByUrl('/dashboard');
  }

  async updateName() {
    if (this.nameForm.invalid || this.updatingName()) return;

    this.updatingName.set(true);
    this.clearMessages();

    try {
      const response = await this.userService.updateName({
        name: this.nameForm.value.name
      }).toPromise();

      // Update local user data
      this.authService.updateUserProfile({ name: this.nameForm.value.name });

      this.showSuccessMessage('Nombre actualizado correctamente');
    } catch (error: any) {
      console.error('Error updating name:', error);
      this.showErrorMessage(error?.error?.message || 'Error al actualizar el nombre');
    } finally {
      this.updatingName.set(false);
    }
  }

  async onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.showErrorMessage('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      this.showErrorMessage('El archivo es demasiado grande. Máximo 5MB');
      return;
    }

    this.uploadingPhoto.set(true);
    this.clearMessages();

    try {
      // Compress image before upload
      const compressedFile = await this.imageCompressionService.compressImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.8
      });

      const response = await this.userService.updateProfilePicture(compressedFile.file).toPromise();

      // Update local user data with new photo URL
      if (response?.photoUrl) {
        this.authService.updateUserProfile({ photoUrl: response.photoUrl });
      }

      this.showSuccessMessage('Foto de perfil actualizada correctamente');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      this.showErrorMessage(error?.error?.message || 'Error al subir la foto');
    } finally {
      this.uploadingPhoto.set(false);
      // Clear the file input
      event.target.value = '';
    }
  }

  async changePassword() {
    if (this.passwordForm.invalid || this.changingPassword()) return;

    this.changingPassword.set(true);
    this.clearMessages();

    try {
      await this.userService.changePassword({
        currentPassword: this.passwordForm.value.currentPassword,
        newPassword: this.passwordForm.value.newPassword
      }).toPromise();

      this.showSuccessMessage('Contraseña cambiada correctamente');
      this.cancelPasswordChange();
    } catch (error: any) {
      console.error('Error changing password:', error);
      this.showErrorMessage(error?.error?.message || 'Error al cambiar la contraseña');
    } finally {
      this.changingPassword.set(false);
    }
  }

  cancelPasswordChange() {
    this.showPasswordForm.set(false);
    this.passwordForm.reset();
  }

  async confirmDeleteAccount() {
    const confirmed = await this.modalService.open({
      title: 'Confirmar Eliminación de Cuenta',
      message: '¿Estás absolutamente seguro de que quieres eliminar tu cuenta? Esta acción es irreversible y se perderán todos tus datos, trivias y configuraciones.'
    });

    if (confirmed) {
      const doubleConfirmed = await this.modalService.open({
        title: 'Última Confirmación',
        message: 'Esta es tu última oportunidad. ¿Realmente quieres eliminar tu cuenta permanentemente?'
      });

      if (doubleConfirmed) {
        await this.deleteAccount();
      }
    }
  }

  async deleteAccount() {
    this.deletingAccount.set(true);
    this.clearMessages();

    try {
      await this.userService.deleteAccount().toPromise();

      this.showSuccessMessage('Cuenta eliminada correctamente');

      // Wait a moment then logout and redirect
      setTimeout(() => {
        this.authService.logout();
        this.router.navigateByUrl('/auth/login');
      }, 2000);
    } catch (error: any) {
      console.error('Error deleting account:', error);
      this.showErrorMessage(error?.error?.message || 'Error al eliminar la cuenta');
      this.deletingAccount.set(false);
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
