import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { JeopardyService } from '../jeopardy/jeopardy.service';
import { Jeopardy, Question } from '../jeopardy/jeopardy';
import { switchMap } from 'rxjs';
import { QuestionModalComponent } from './question-modal/question-modal.component';
import { ModalService } from '../shared/modal.service';
import { WinnerComponent } from '../winner/winner.component';
import { CanComponentDeactivate } from './can-deactivate-game.guard';

interface Team {
  name: string;
  score: number;
}

@Component({
  selector: 'app-game-play',
  standalone: true,
  imports: [CommonModule, QuestionModalComponent, WinnerComponent],
  templateUrl: './game-play.component.html',
})
export default class GamePlayComponent implements OnInit, CanComponentDeactivate {
  private route = inject(ActivatedRoute);
  private jeopardyService = inject(JeopardyService);
  private router = inject(Router);
  private modalService = inject(ModalService);
  private suspenseSound?: HTMLAudioElement;
  private doublePointsSound?: HTMLAudioElement;

  jeopardy = signal<Jeopardy | null>(null);
  teams = signal<Team[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  answeredQuestions = signal<Set<string>>(new Set());
  selectedQuestion = signal<Question | null>(null);
  editingTeamIndex = signal<number | null>(null);
  timePerQuestion = signal(30);

  showWinnerScreen = signal(false);
  winners = signal<Team[]>([]);
  winnerScore = signal(0);

  categoryColors = ['bg-blue-600', 'bg-purple-600', 'bg-yellow-500', 'bg-sky-500', 'bg-green-500', 'bg-red-600'];

  ngOnInit(): void {
    this.suspenseSound = new Audio('/media/sound/suspenso.mp3');
    this.suspenseSound.loop = true;
    this.doublePointsSound = new Audio('/media/sound/puntosdobles.mp3');
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) {
          this.error.set('No se encontró el ID de la trivia.');
          this.loading.set(false);
          throw new Error('Jeopardy ID is required');
        }
        this.initializeTeams();
        return this.jeopardyService.getJeopardyById(id);
      })
    ).subscribe({
      next: (data) => {
        this.jeopardy.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('No se pudo cargar la trivia.');
        this.loading.set(false);
        console.error(err);
      }
    });
  }

  initializeTeams() {
    this.route.queryParamMap.subscribe(params => {
      const teamCountStr = params.get('teams') || '1';
      const teamCount = parseInt(teamCountStr, 10);
      const newTeams: Team[] = [];
      for (let i = 1; i <= teamCount; i++) {
        newTeams.push({ name: `Equipo ${i}`, score: 0 });
      }
      this.teams.set(newTeams);

      const timeStr = params.get('time') || '30';
      this.timePerQuestion.set(parseInt(timeStr, 10));
    });
  }

  adjustScore(teamIndex: number, amount: number) {
    this.teams.update(currentTeams => {
      const newTeams = [...currentTeams];
      newTeams[teamIndex].score += amount;
      return newTeams;
    });
  }

  onQuestionClick(questionId: string) {
    if (this.answeredQuestions().has(questionId) || this.selectedQuestion()) {
      return;
    }
    const allQuestions = this.jeopardy()?.categories.flatMap(c => c.questions) || [];
    const question = allQuestions.find(q => q.id === questionId);
    if (question) {
      this.selectedQuestion.set(question);
      if (question.doublePoints) {
        this.doublePointsSound?.play();
        if (this.doublePointsSound) {
          this.doublePointsSound.onended = () => {
            this.suspenseSound?.play();
            this.doublePointsSound!.onended = null;
          };
        }
      } else {
        this.suspenseSound?.play();
      }
    }
  }

  closeQuestionModal() {
    this.stopAllSounds();
    const questionId = this.selectedQuestion()?.id;
    if (questionId) {
      this.answeredQuestions.update(set => {
        set.add(questionId);
        return new Set(set);
      });
    }
    this.selectedQuestion.set(null);
  }

  stopAllSounds() {
    if (this.suspenseSound) {
      this.suspenseSound.pause();
      this.suspenseSound.currentTime = 0;
    }
    if (this.doublePointsSound) {
      this.doublePointsSound.pause();
      this.doublePointsSound.currentTime = 0;
      this.doublePointsSound.onended = null;
    }
  }

  startEditingTeam(index: number) {
    this.editingTeamIndex.set(index);
  }

  saveTeamName(index: number, event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const newName = inputElement.value;

    if (newName && newName.trim() !== '') {
      this.teams.update(currentTeams => {
        const newTeams = [...currentTeams];
        newTeams[index].name = newName.trim();
        return newTeams;
      });
    }
    this.editingTeamIndex.set(null);
  }

  cancelEditing() {
    this.editingTeamIndex.set(null);
  }

  async confirmEndGame() {
    const totalQuestions = this.jeopardy()?.categories.flatMap(c => c.questions).length || 0;
    const answeredCount = this.answeredQuestions().size;

    let confirmed = false;
    if (totalQuestions > 0 && answeredCount === totalQuestions) {
      confirmed = true;
    } else {
      confirmed = await this.modalService.open({
        title: 'Terminar Juego',
        message: '¿Estás seguro de que quieres terminar el juego? El progreso actual se perderá.'
      });
    }

    if (confirmed) {
      const teams = this.teams();
      if (teams.length > 0) {
          const maxScore = Math.max(...teams.map(t => t.score));
          const winners = teams.filter(t => t.score === maxScore);

          this.winners.set(winners);
          this.winnerScore.set(maxScore);
          this.showWinnerScreen.set(true);
      } else {
          this.goToDashboard();
      }
    }
  }

  canDeactivate(): boolean | Promise<boolean> {
    const totalQuestions = this.jeopardy()?.categories.flatMap(c => c.questions).length || 0;
    const answeredCount = this.answeredQuestions().size;

    if (this.showWinnerScreen() || (totalQuestions > 0 && answeredCount === totalQuestions)) {
      return true;
    }

    return this.modalService.open({
      title: 'Salir del Juego',
      message: '¿Estás seguro de que quieres salir del juego? El progreso actual se perderá.'
    });
  }

  goToDashboard() {
    this.router.navigate(['/']);
  }
}
