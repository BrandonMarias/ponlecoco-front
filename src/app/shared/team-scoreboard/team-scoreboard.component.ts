import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Team {
  name: string;
  score: number;
}

@Component({
  selector: 'app-team-scoreboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './team-scoreboard.component.html',
})
export class TeamScoreboardComponent {
  @Input({ required: true }) teams: Team[] = [];
  @Input() currentTeamIndex: number | null = null;
  @Input() editingTeamIndex: number | null = null;

  @Output() editTeam = new EventEmitter<number>();
  @Output() saveTeam = new EventEmitter<{ index: number; event: Event }>();
  @Output() cancelEdit = new EventEmitter<void>();

  onSaveTeam(index: number, event: Event) {
    this.saveTeam.emit({ index, event });
  }
}
