import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { passwordMatchValidator, passwordStrengthValidator } from '../validators';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './register.component.html',
})
export default class RegisterComponent {
  private fb = inject(FormBuilder);

  registerForm = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6), passwordStrengthValidator()]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordMatchValidator('password', 'confirmPassword') });

  onSubmit() {
    if (this.registerForm.valid) {
      console.log('Form Submitted', this.registerForm.value);
    } else {
      this.registerForm.markAllAsTouched();
    }
  }
}