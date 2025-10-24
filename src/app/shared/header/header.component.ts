import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  private router = inject(Router);
  showMenu = signal(false);

  toggleMenu() {
    this.showMenu.set(!this.showMenu());
  }

  navigateToProfile() {
    this.router.navigateByUrl('/profile');
    this.showMenu.set(false);
  }

  logout() {
    this.authService.logout();
  }
}
