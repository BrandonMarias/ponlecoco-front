import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { TruncateWordsPipe } from '../truncate-words.pipe';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, TruncateWordsPipe],
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