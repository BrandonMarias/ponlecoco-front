import { Component, input, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';

interface PlayerScore {
  userId: string;
  username: string;
  score: number;
  previousScore?: number;
  previousRank?: number;
  currentRank?: number;
  isCorrect?: boolean;
}

interface QuestionResults {
  correctAnswerIndex: number;
  scores: PlayerScore[];
}

@Component({
  selector: 'app-quick-thinking-results',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-2xl font-bold mb-4 flex items-center gap-3">
          <svg class="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          Resultados
        </h2>

        <!-- Respuesta Correcta -->
        <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-600 rounded-lg p-4 mb-6">
          <p class="text-green-800 dark:text-green-300 font-medium mb-2">
            <strong>Respuesta correcta:</strong>
          </p>
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
              {{ getOptionLetter(currentResults()?.correctAnswerIndex ?? 0) }}
            </span>
            <span class="text-green-900 dark:text-green-100 font-medium">
              {{ questionOptions()[currentResults()?.correctAnswerIndex ?? 0] }}
            </span>
          </div>
        </div>

        <!-- Ranking de Jugadores -->
        <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
          🏆 Ranking de Jugadores
        </h3>
        <div class="space-y-3" #rankingContainer>
          @for (player of rankedPlayers(); track player.userId; let i = $index) {
            <div
              [attr.data-player-id]="player.userId"
              class="player-card bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-between"
              [class.bg-yellow-50]="i === 0"
              [class.dark:bg-yellow-900/20]="i === 0"
              [class.border]="i === 0"
              [class.border-yellow-400]="i === 0"
              [class.dark:border-yellow-600]="i === 0"
            >
              <div class="flex items-center gap-4 flex-1">
                <span class="rank-emoji text-3xl">{{ getRankEmoji(player.currentRank ?? i) }}</span>
                <div class="flex-1">
                  <p class="font-semibold">{{ player.username }}</p>
                  @if (showScoreChange() && player.previousScore !== undefined) {
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      @if (player.score > player.previousScore) {
                        <span class="text-green-600 dark:text-green-400">+{{ player.score - player.previousScore }} pts</span>
                      } @else if (player.score === player.previousScore) {
                        <span class="text-gray-500">Sin cambios</span>
                      }
                    </p>
                  }
                </div>
              </div>
              <div class="text-right">
                <p class="score-value text-xl font-bold text-green-600 dark:text-green-400">
                  {{ player.score }} pts
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Total acumulado
                </p>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .player-card {
      position: relative;
      transition: background-color 0.3s ease;
      will-change: transform;
    }

    .rank-emoji {
      display: inline-block;
      min-width: 40px;
      text-align: center;
      will-change: transform, opacity;
    }

    .score-value {
      transition: color 0.3s ease;
      will-change: transform, color;
    }

    /* Animación de entrada para la primera vez */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .player-card {
      animation: fadeInUp 0.5s ease-out;
      animation-fill-mode: both;
    }

    .player-card:nth-child(1) { animation-delay: 0.1s; }
    .player-card:nth-child(2) { animation-delay: 0.2s; }
    .player-card:nth-child(3) { animation-delay: 0.3s; }
    .player-card:nth-child(4) { animation-delay: 0.4s; }
    .player-card:nth-child(5) { animation-delay: 0.5s; }
  `]
})
export class QuickThinkingResultsComponent {
  // Inputs
  currentResults = input.required<QuestionResults | null>();
  previousResults = input<QuestionResults | null>(null);
  questionOptions = input.required<string[]>();
  hostId = input.required<string>(); // ID del host para excluirlo del ranking

  // State
  rankedPlayers = signal<PlayerScore[]>([]);
  showScoreChange = signal(false);
  private hasAnimated = signal(false);

  constructor() {
    // Efecto que se ejecuta cuando cambian los resultados
    effect(() => {
      const current = this.currentResults();
      const previous = this.previousResults();

      if (!current) return;

      // Si hay resultados anteriores y no hemos animado, prepara la animación
      if (previous && !this.hasAnimated()) {
        this.prepareAnimation(previous, current);
      } else {
        // Primera vez o sin animación, solo muestra los resultados
        this.rankedPlayers.set(this.rankPlayers(current.scores));
        this.showScoreChange.set(!!previous);
        // Resetear flag si es una nueva pregunta sin resultados anteriores
        if (!previous) {
          this.hasAnimated.set(false);
        }
      }
    });
  }

  private prepareAnimation(previous: QuestionResults, current: QuestionResults): void {
    // Resetear flag de animación
    this.hasAnimated.set(false);

    // 1. Primero muestra los resultados anteriores
    const previousRanked = this.rankPlayers(previous.scores);
    this.rankedPlayers.set(previousRanked);
    this.showScoreChange.set(false);

    // 2. Después de un momento, anima hacia los nuevos resultados
    setTimeout(() => {
      this.animateToNewResults(current);
    }, 1500); // Espera 1.5 segundos mostrando resultados anteriores
  }

  private animateToNewResults(current: QuestionResults): void {
    const newRanked = this.rankPlayers(current.scores);

    // Mapear posiciones anteriores
    const previousPositions = new Map<string, number>();
    this.rankedPlayers().forEach((player, index) => {
      previousPositions.set(player.userId, index);
    });

    // Agregar información de cambios
    const playersWithChanges = newRanked.map((player, newIndex) => {
      const previousIndex = previousPositions.get(player.userId);
      return {
        ...player,
        previousRank: previousIndex,
        currentRank: newIndex,
        previousScore: this.rankedPlayers().find(p => p.userId === player.userId)?.score
      };
    });

    // Actualizar el ranking
    this.rankedPlayers.set(playersWithChanges);
    this.showScoreChange.set(true);

    // Ejecutar animación GSAP
    this.animateRankChanges();
    this.hasAnimated.set(true);
  }

  private animateRankChanges(): void {
    const cards = document.querySelectorAll('.player-card');

    // Timeline para coordinar todas las animaciones
    const tl = gsap.timeline();

    // Guardar posiciones originales para calcular desplazamientos
    const positions = new Map<string, { top: number; height: number }>();
    cards.forEach((card) => {
      const playerId = card.getAttribute('data-player-id');
      if (playerId) {
        const rect = card.getBoundingClientRect();
        positions.set(playerId, { top: rect.top, height: rect.height });
      }
    });

    // Animar cada tarjeta
    this.rankedPlayers().forEach((player, newIndex) => {
      const card = document.querySelector(`[data-player-id="${player.userId}"]`);
      if (!card || player.previousRank === undefined) return;

      const previousIndex = player.previousRank;
      const displacement = (newIndex - previousIndex) * (positions.get(player.userId)?.height || 80 + 12); // altura + gap

      if (displacement !== 0) {
        // Configurar posición inicial (vienen desde su posición anterior)
        gsap.set(card, { y: -displacement, zIndex: 10 });

        // Animar a la posición final
        tl.to(card, {
          y: 0,
          duration: 1,
          ease: 'power2.inOut',
          onStart: () => {
            // Efecto de resaltado durante el movimiento
            gsap.to(card, {
              scale: 1.03,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              duration: 0.5,
              yoyo: true,
              repeat: 1,
              ease: 'power1.inOut'
            });
          },
          onComplete: () => {
            gsap.set(card, { zIndex: 1 });
          }
        }, '<0.1'); // Inicia un poco después de la animación anterior para efecto cascada
      }

      // Animar el score con efecto "counter"
      const scoreElement = card.querySelector('.score-value');
      if (scoreElement && player.previousScore !== undefined && player.score !== player.previousScore) {
        const obj = { value: player.previousScore };
        tl.to(obj, {
          value: player.score,
          duration: 1.5,
          ease: 'power1.out',
          onUpdate: () => {
            scoreElement.textContent = `${Math.round(obj.value)} pts`;
          },
          onComplete: () => {
            scoreElement.textContent = `${player.score} pts`;
          }
        }, '<');

        // Si ganó puntos, resaltar
        const scoreChange = player.score - player.previousScore;
        if (scoreChange > 0) {
          tl.to(scoreElement, {
            scale: 1.3,
            color: '#10b981', // green-500
            duration: 0.3,
            yoyo: true,
            repeat: 1,
            ease: 'elastic.out(1, 0.3)'
          }, '<0.5');
        }
      }

      // Animar el emoji de ranking si cambió de posición
      if (player.previousRank !== undefined && player.currentRank !== player.previousRank) {
        const emojiElement = card.querySelector('.rank-emoji');
        if (emojiElement) {
          tl.fromTo(emojiElement,
            {
              scale: 0,
              rotation: player.currentRank! < player.previousRank ? -360 : 360, // Gira diferente según si sube o baja
              opacity: 0
            },
            {
              scale: 1,
              rotation: 0,
              opacity: 1,
              duration: 0.6,
              ease: 'back.out(2)'
            },
            '<0.3'
          );
        }
      }
    });

    // Animación final de celebración para el top 3
    tl.to('.player-card:nth-child(-n+3)', {
      boxShadow: '0 0 30px rgba(99, 102, 241, 0.5)',
      duration: 0.6,
      stagger: 0.15,
      ease: 'power2.out'
    }, '+=0.2');

    // Efecto de confetti para el primer lugar
    const firstCard = document.querySelector('.player-card:first-child');
    if (firstCard) {
      tl.to(firstCard, {
        backgroundColor: 'rgba(254, 249, 195, 0.5)', // yellow glow
        duration: 0.5,
        yoyo: true,
        repeat: 1,
        ease: 'sine.inOut'
      }, '<');
    }
  }

  private rankPlayers(scores: PlayerScore[]): PlayerScore[] {
    // Filtrar el host del ranking
    const playersWithoutHost = scores.filter(player => player.userId !== this.hostId());

    // Ordenar por score y agregar el rank actual
    return playersWithoutHost
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // Top 10 jugadores
      .map((player, index) => ({
        ...player,
        currentRank: index // Agregar el rank actual al jugador
      }));
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index); // A, B, C, D...
  }

  getRankEmoji(rank: number): string {
    const emojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    return emojis[rank] || `${rank + 1}`;
  }
}
