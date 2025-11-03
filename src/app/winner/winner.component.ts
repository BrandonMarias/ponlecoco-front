import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
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
      @Input() winners: Team[] = [];
      @Input() score = 0;
      @Input() allTeams: Team[] = []; // Recibir todos los equipos
      @Output() close = new EventEmitter<void>();

      private winnerSound = new Audio('/media/sound/winer.mp3');
      topThree: Team[] = [];

      ngOnInit(): void {
        this.winnerSound.play();
        this.calculateTopThree();
      }

      calculateTopThree(): void {
        // Si se proporcionaron allTeams, usarlos para calcular top 3
        if (this.allTeams && this.allTeams.length > 0) {
          // Ordenar por puntuación descendente y tomar los primeros 3
          this.topThree = [...this.allTeams]
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
        }
      }

      onClose() {
        this.close.emit();
      }
    }
