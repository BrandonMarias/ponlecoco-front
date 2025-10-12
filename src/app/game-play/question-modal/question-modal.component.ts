import { Component, Input, Output, EventEmitter, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Question } from '../../jeopardy/jeopardy';

@Component({
  selector: 'app-question-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './question-modal.component.html',
})
export class QuestionModalComponent implements OnInit, OnDestroy {
  @Input({ required: true }) question!: Question;
  @Input() timeLimit = 30;
  @Output() close = new EventEmitter<void>();
  @Output() answerRevealed = new EventEmitter<void>();
  @Output() timeUp = new EventEmitter<void>();

  showAnswer = signal(false);
  timeLeft = signal(0);
  showTimeUpBanner = signal(false);

  private timerInterval: any;
  private timeUpSound = new Audio('/media/sound/tiempoacabado.mp3');
  private winSound = new Audio('/media/sound/win.mp3');
  private loseSound = new Audio('/media/sound/lose.mp3');
  private drumrollSound = new Audio('/media/sound/redobletambores.mp3');

  formattedTime = computed(() => {
    const minutes = Math.floor(this.timeLeft() / 60);
    const seconds = this.timeLeft() % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });

  ngOnInit(): void {
    this.timeLeft.set(this.timeLimit);
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  startTimer() {
    this.clearTimer(); // Ensure no multiple timers running
    this.timerInterval = setInterval(() => {
      this.timeLeft.update(t => t - 1);
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
    this.timeUp.emit();
    this.timeUpSound.play();
    this.showTimeUpBanner.set(true);
  }

  revealAnswer() {
    this.drumrollSound.play();
    this.showAnswer.set(true);
    this.showTimeUpBanner.set(false);
    this.clearTimer();
    this.answerRevealed.emit();
  }

  onCorrect() {
    this.drumrollSound.pause();
    this.drumrollSound.currentTime = 0;
    this.winSound.play();
    this.onClose();
  }

  onIncorrect() {
    this.drumrollSound.pause();
    this.drumrollSound.currentTime = 0;
    this.loseSound.play();
    this.onClose();
  }

  onClose() {
    this.close.emit();
    // Reset for next time it opens
    this.showAnswer.set(false);
    this.showTimeUpBanner.set(false);
  }
}
