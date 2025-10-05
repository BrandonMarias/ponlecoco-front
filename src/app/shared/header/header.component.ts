import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  authService = inject(AuthService);
  showMenu = signal(false);

  toggleMenu() {
    this.showMenu.set(!this.showMenu());
  }

  logout() {
    this.authService.logout();
  }
}