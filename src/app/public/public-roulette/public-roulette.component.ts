import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RouletteService } from '../../roulette/roulette.service';
import { Roulette } from '../../roulette/roulette';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-public-roulette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './public-roulette.component.html',
})
export default class PublicRouletteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private rouletteService = inject(RouletteService);
  private authService = inject(AuthService);

  roulette = signal<Roulette | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  showTeamSelection = signal(true);
  teamCount = signal(2);
  timePerQuestion = signal(30);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPublicRoulette(id);
    } else {
      this.error.set('ID de ruleta no válido');
      this.loading.set(false);
    }
  }

  loadPublicRoulette(id: string) {
    this.loading.set(true);
    this.error.set(null);

    this.rouletteService.getPublicRoulette(id).subscribe({
      next: (roulette) => {
        this.roulette.set(roulette);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('No se pudo cargar la ruleta. Puede que no esté disponible públicamente.');
        console.error(err);
        this.loading.set(false);
      }
    });
  }

  startGame() {
    if (!this.roulette()?.id) return;

    this.router.navigate(['/public/play-roulette', this.roulette()!.id], {
      queryParams: {
        teams: this.teamCount(),
        time: this.timePerQuestion(),
        public: true // Mark as public game
      }
    });
  }

  goToHome() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }
}
