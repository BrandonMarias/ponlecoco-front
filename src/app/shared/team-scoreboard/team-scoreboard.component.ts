import { Component, input, output } from '@angular/core';
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
  // Input signals
  teams = input.required<Team[]>();
  currentTeamIndex = input<number | null>(null);
  editingTeamIndex = input<number | null>(null);

  // Output signals
  editTeam = output<number>();
  saveTeam = output<{ index: number; event: Event }>();
  cancelEdit = output<void>();

  onSaveTeam(index: number, event: Event) {
    this.saveTeam.emit({ index, event });
  }
}
