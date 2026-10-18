import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Question } from '../../triviaparty/triviaparty';
import { Team } from '../../shared/team-scoreboard/team-scoreboard.component';

type ModalState =
  |'answering'
  | 'time_up_options'
  | 'steal_team_select'
  | 'steal_in_progress'
  | 'showing_final_answer'
  | 'steal_failed_show_answer';

@Component({
  selector: 'app-question-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './question-modal.component.html',
})
export class QuestionModalComponent implements OnInit, OnDestroy {
  @Input({ required: true }) question!: Question;
  @Input() timeLimit = 30;
  @Input() teams: Team[] = [];
  @Input() currentTeamIndex = 0;
  @Input() stealPointsEnabled = true; // Control de robo de puntos

  @Output() close = new EventEmitter<void>();
  @Output() answerRevealed = new EventEmitter<void>();
  @Output() updateScore = new EventEmitter<{
    teamIndex: number;
    points: number;
  }>();
  @Output() nextTurn = new EventEmitter<void>();

  modalState = signal<ModalState>('answering');
  showAnswer = signal(false);
  timeLeft = signal(0);
  stealingTeamIndex = signal<number | null>(null);

  private timerInterval: any;
  private timeUpSound = new Audio('/media/sound/tiempoacabado.mp3');
  private winSound = new Audio('/media/sound/win.mp3');
  private loseSound = new Audio('/media/sound/lose.mp3');
  private drumrollSound = new Audio('/media/sound/redobletambores.mp3');
  private suspenseAudio?: HTMLAudioElement;

  /** The 1.5MB loop is only created (and fetched) the first time it is needed. */
  private get suspenseSound(): HTMLAudioElement {
    if (!this.suspenseAudio) {
      this.suspenseAudio = new Audio('/media/sound/suspenso.mp3');
      this.suspenseAudio.loop = true;
    }
    return this.suspenseAudio;
  }

  formattedTime = computed(() => {
    const minutes = Math.floor(this.timeLeft() / 60);
    const seconds = this.timeLeft() % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  });

  isStealing = computed(() => this.modalState() === 'steal_in_progress');
  availableStealTeams = computed(() =>
    this.teams.filter((_, i) => i !== this.currentTeamIndex)
  );

  ngOnInit(): void {
    this.timeLeft.set(this.timeLimit);
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.drumrollSound.pause();
    this.drumrollSound.currentTime = 0;
    this.stopSuspense();
  }

  private stopSuspense() {
    if (this.suspenseAudio) {
      this.suspenseAudio.pause();
      this.suspenseAudio.currentTime = 0;
    }
  }

  startTimer() {
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      this.timeLeft.update((t) => t - 1);
      if (this.timeLeft() <= 0) {
        this.handleTimeUp();
      }
    }, 1000);
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handleTimeUp() {
    this.clearTimer();
    this.timeUpSound.play();

    if (this.modalState() === 'answering') {
      this.modalState.set('time_up_options');
      this.answerRevealed.emit();
    } else if (this.modalState() === 'steal_in_progress') {
      this.stopSuspense();
      const points = this.question.value;
      this.updateScore.emit({
        teamIndex: this.stealingTeamIndex()!,
        points: -points,
      });
      this.loseSound.play();
      this.modalState.set('steal_failed_show_answer');
    }
  }

  revealAnswer() {
    this.clearTimer();
    this.stopSuspense();
    this.drumrollSound.play();
    this.showAnswer.set(true);
    this.answerRevealed.emit();
  }

  onCorrect() {
    this.clearTimer();
    this.stopSuspense();
    this.drumrollSound.pause();
    this.drumrollSound.currentTime = 0;
    this.winSound.play();

    if (this.modalState() === 'answering') {
      const points = this.question.value * (this.question.doublePoints ? 2 : 1);
      this.updateScore.emit({ teamIndex: this.currentTeamIndex, points });
    } else if (this.modalState() === 'steal_in_progress') {
      const points = this.question.value;
      this.updateScore.emit({ teamIndex: this.stealingTeamIndex()!, points });
    }
    this.nextTurn.emit();
    this.close.emit();
  }

  onIncorrect() {
    this.clearTimer();
    this.stopSuspense();
    this.drumrollSound.pause();
    this.drumrollSound.currentTime = 0;
    this.loseSound.play();

    if (this.modalState() === 'answering') {
      // No score change
    } else if (this.modalState() === 'steal_in_progress') {
      const points = this.question.value;
      this.updateScore.emit({
        teamIndex: this.stealingTeamIndex()!,
        points: -points,
      });
    }
    this.nextTurn.emit();
    this.close.emit();
  }

  onTimeUpFinish() {
    this.drumrollSound.play();
    this.modalState.set('showing_final_answer');
    this.showAnswer.set(true);
  }

  onTimeUpClose() {
    this.drumrollSound.pause();
    this.drumrollSound.currentTime = 0;
    this.loseSound.play();
    this.nextTurn.emit();
    this.close.emit();
  }

  onTimeUpSteal() {
    this.modalState.set('steal_team_select');
  }

  selectTeamForSteal(index: number) {
    this.stealingTeamIndex.set(index);
    this.modalState.set('steal_in_progress');
    this.timeLeft.set(10);
    this.suspenseSound.play();
    this.startTimer();
  }

  showAnswerAfterFailedSteal() {
    this.modalState.set('showing_final_answer');
    this.showAnswer.set(true);
  }
}
