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
      @Output() close = new EventEmitter<void>();

      private winnerSound = new Audio('/media/sound/winer.mp3');

      ngOnInit(): void {
        this.winnerSound.play();
      }

      onClose() {
        this.close.emit();
      }
    }
    