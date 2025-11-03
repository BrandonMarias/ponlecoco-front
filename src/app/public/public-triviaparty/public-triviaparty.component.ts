import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TriviaPartyService } from '../../triviaparty/triviaparty.service';
import { TriviaParty } from '../../triviaparty/triviaparty';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-public-triviaparty',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './public-triviaparty.component.html',
})
export default class PublicTriviaPartyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private triviaPartyService = inject(TriviaPartyService);
  private authService = inject(AuthService);

  triviaParty = signal<TriviaParty | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  showTeamSelection = signal(true);
  teamCount = signal(2);
  timePerQuestion = signal(30);
  stealPointsEnabled = signal(true);

  // Store the access token or id to pass to the game
  private accessToken: string | null = null;
  private triviaId: string | null = null;

  ngOnInit() {
    // Check if there's a code (token) parameter first
    const code = this.route.snapshot.queryParamMap.get('code');

    if (code) {
      this.accessToken = code;
      this.loadTriviaPartyByToken(code);
    } else {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.triviaId = id;
        this.loadPublicTriviaParty(id);
      } else {
        this.error.set('❌ No se proporcionó un enlace válido para acceder a la trivia.');
        this.loading.set(false);
      }
    }
  }

  loadTriviaPartyByToken(token: string) {
    this.loading.set(true);
    this.error.set(null);

    this.triviaPartyService.getTriviaPartyByToken(token).subscribe({
      next: (triviaParty) => {
        this.triviaParty.set(triviaParty);
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
          this.error.set('❌ Trivia no encontrada.');
        } else {
          this.error.set('No se pudo cargar la trivia.');
        }
        console.error(err);
        this.loading.set(false);
      }
    });
  }

  loadPublicTriviaParty(id: string) {
    this.loading.set(true);
    this.error.set(null);

    this.triviaPartyService.getPublicTriviaParty(id).subscribe({
      next: (triviaParty) => {
        this.triviaParty.set(triviaParty);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('No se pudo cargar la trivia. Puede que no esté disponible públicamente.');
        console.error(err);
        this.loading.set(false);
      }
    });
  }

  startGame() {
    if (!this.triviaParty()?.id) return;

    const queryParams: any = {
      teams: this.teamCount(),
      time: this.timePerQuestion(),
      stealPoints: this.stealPointsEnabled(),
      public: true
    };

    // If accessed via token, pass the token instead of the id
    if (this.accessToken) {
      queryParams.token = this.accessToken;
    }

    this.router.navigate(['/public/play', this.triviaParty()!.id], {
      queryParams
    });
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  goToHome() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/auth/login']);
    }
  }
}
