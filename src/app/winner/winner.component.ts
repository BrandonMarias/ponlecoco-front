import { Component, input, output, OnInit, effect, signal } from '@angular/core';
    import { CommonModule } from '@angular/common';

    // You might want to move this interface to a shared file
    interface Team {
      name: string;
      score: number;
    }

    @Component({
      selector: 'app-winner',
      standalone: true,
      imports: [CommonModule],
      templateUrl: './winner.component.html',
      styleUrls: ['./winner.component.css']
    })
    export class WinnerComponent implements OnInit {
      // Input signals
      winners = input<Team[]>([]);
      score = input<number>(0);
      allTeams = input<Team[]>([]);

      // Output signals
      close = output<void>();

      // Local signals
      topThree = signal<Team[]>([]);

      private winnerSound = new Audio('/media/sound/winer.mp3');

      constructor() {
        // Effect que se ejecuta cuando allTeams cambia
        effect(() => {
          const teams = this.allTeams();
          if (teams && teams.length > 0) {
            // Ordenar por puntuación descendente y tomar los primeros 3
            const sorted = [...teams]
              .sort((a, b) => b.score - a.score)
              .slice(0, 3);
            this.topThree.set(sorted);
          }
        });
      }

      ngOnInit(): void {
        this.winnerSound.play();
      }

      onClose() {
        this.close.emit();
      }
    }
