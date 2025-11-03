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

  // Store the access token or id to pass to the game
  private accessToken: string | null = null;
  private rouletteId: string | null = null;

  ngOnInit() {
    // Check if there's a code (token) parameter first
    const code = this.route.snapshot.queryParamMap.get('code');
    
    if (code) {
      this.accessToken = code;
      this.loadRouletteByToken(code);
    } else {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.rouletteId = id;
        this.loadPublicRoulette(id);
      } else {
        this.error.set('❌ No se proporcionó un enlace válido para acceder a la ruleta.');
        this.loading.set(false);
      }
    }
  }

  loadRouletteByToken(token: string) {
    this.loading.set(true);
    this.error.set(null);

    this.rouletteService.getRouletteByToken(token).subscribe({
      next: (roulette) => {
        this.roulette.set(roulette);
        this.loading.set(false);
      },
      error: (err) => {
        if (err.status === 401) {
          if (err.error?.message?.includes('expirado')) {
            this.error.set('⏱️ Este enlace ha expirado. Los enlaces son válidos por 3 días.');
          } else {
            this.error.set('🔒 Este enlace no es válido.');
          }
        } else if (err.status === 404) {
          this.error.set('❌ Ruleta no encontrada.');
        } else {
          this.error.set('No se pudo cargar la ruleta.');
        }
        console.error(err);
        this.loading.set(false);
      }
    });
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

    const queryParams: any = {
      teams: this.teamCount(),
      time: this.timePerQuestion(),
      public: true
    };

    // If accessed via token, pass the token instead of the id
    if (this.accessToken) {
      queryParams.token = this.accessToken;
    }

    this.router.navigate(['/public/play-roulette', this.roulette()!.id], {
      queryParams
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
