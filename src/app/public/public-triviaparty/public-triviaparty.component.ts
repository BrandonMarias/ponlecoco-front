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

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPublicTriviaParty(id);
    } else {
      this.error.set('ID de trivia no válido');
      this.loading.set(false);
    }
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

    this.router.navigate(['/public/play', this.triviaParty()!.id], {
      queryParams: {
        teams: this.teamCount(),
        time: this.timePerQuestion(),
        public: true // Mark as public game
      }
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
