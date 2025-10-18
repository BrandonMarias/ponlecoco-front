import { Component, signal, inject, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { RouletteService } from '../roulette/roulette.service';
import { Roulette, RouletteQuestion } from '../roulette/roulette';
import { FormsModule } from '@angular/forms';

interface GameState {
  currentQuestionIndex: number;
  scores: number[];
  currentTeam: number;
  showQuestion: boolean;
  gameStarted: boolean;
  gameEnded: boolean;
  questionOrder: number[];
  spinning: boolean;
  selectedPosition: number;
  showViewQuestionButton: boolean;
  timeRemaining: number;
  timerActive: boolean;
}

interface RoulettePosition {
  angle: number;
  value: number;
  questionIndex: number;
}

@Component({
  selector: 'app-roulette-game',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roulette-game.component.html'
})
export class RouletteGameComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private rouletteService = inject(RouletteService);

  roulette = signal<Roulette | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  showAnswer = signal(false);
  teamCount = 1;
  timePerQuestion = 60;

  // Audio management
  private currentSuspenseAudio: HTMLAudioElement | null = null;

  // Timer management
  private timerInterval: any = null;

  // Roulette positions with their angles and values
  // Angles are measured from the top (arrow position) clockwise
  private roulettePositions: RoulettePosition[] = [
    { angle: 15, value: 200, questionIndex: 0 },    // Top
    { angle: 45, value: 400, questionIndex: 1 },   // 1 o'clock
    { angle: 75, value: 100, questionIndex: 2 },   // 2 o'clock
    { angle: 105, value: 200, questionIndex: 3 },   // 3 o'clock
    { angle: 135, value: 300, questionIndex: 4 },  // 4 o'clock
    { angle: 165, value: 400, questionIndex: 5 },  // 5 o'clock
    { angle: 195, value: 100, questionIndex: 6 },  // 6 o'clock
    { angle: 225, value: 500, questionIndex: 7 },  // 7 o'clock
    { angle: 255, value: 400, questionIndex: 8 },  // 8 o'clock
    { angle: 285, value: 300, questionIndex: 9 },  // 9 o'clock
    { angle: 315, value: 500, questionIndex: 10 }, // 10 o'clock
    { angle: 345, value: 100, questionIndex: 11 }  // 11 o'clock
  ];

  private gameState = signal<GameState>({
    currentQuestionIndex: 0,
    scores: [],
    currentTeam: 0,
    showQuestion: false,
    gameStarted: false,
    gameEnded: false,
    questionOrder: [],
    spinning: false,
    selectedPosition: 0,
    showViewQuestionButton: false,
    timeRemaining: 0,
    timerActive: false
  });

  // Public getter for template access
  getGameState = computed(() => this.gameState());

  wheelRotation = signal(0);

  currentQuestion = computed(() => {
    const state = this.gameState();
    const rouletteData = this.roulette();
    if (!rouletteData || state.questionOrder.length === 0) return null;

    // USA LA POSICIÓN DONDE CAYÓ LA RULETA
    const questionIndex = state.questionOrder[state.selectedPosition];
    return rouletteData.questions[questionIndex] || null;
  });

  winnerTeam = computed(() => {
    const scores = this.gameState().scores;
    const maxScore = Math.max(...scores);
    return scores.findIndex(score => score === maxScore);
  });

  ngOnInit() {
    const rouletteId = this.route.snapshot.params['id'];
    const queryParams = this.route.snapshot.queryParams;

    this.teamCount = parseInt(queryParams['teams']) || 1;
    this.timePerQuestion = parseInt(queryParams['time']) || 60;

    if (rouletteId) {
      this.loadRoulette(rouletteId);
    } else {
      this.error.set('ID de ruleta no encontrado');
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    // Stop any playing sounds and timer
    this.stopSuspenseSound();
    this.stopTimer();
  }

  loadRoulette(id: string) {
    this.rouletteService.getRouletteById(id).subscribe({
      next: (roulette: Roulette) => {
        this.roulette.set(roulette);
        this.initializeGame();
        this.loading.set(false);
      },
      error: (error: any) => {
        this.error.set('Error al cargar la ruleta');
        this.loading.set(false);
        console.error(error);
      }
    });
  }

  initializeGame() {
    const rouletteData = this.roulette();
    if (!rouletteData) return;

    // Create randomized question order
    const questionOrder = this.createRandomQuestionOrder(rouletteData.questions);

    // Reset wheel to original position
    this.wheelRotation.set(0);

    this.gameState.set({
      currentQuestionIndex: 0,
      scores: new Array(this.teamCount).fill(0),
      currentTeam: 0,
      showQuestion: false,
      gameStarted: false,
      gameEnded: false,
      questionOrder: questionOrder,
      spinning: false,
      selectedPosition: 0,
      showViewQuestionButton: false,
      timeRemaining: this.timePerQuestion,
      timerActive: false
    });
  }

  createRandomQuestionOrder(questions: RouletteQuestion[]): number[] {
    // Group questions by value to ensure proper distribution
    const questionsByValue: { [key: number]: number[] } = {};

    questions.forEach((question, index) => {
      if (!questionsByValue[question.value]) {
        questionsByValue[question.value] = [];
      }
      questionsByValue[question.value].push(index);
    });

    // Shuffle each group
    Object.keys(questionsByValue).forEach(value => {
      const indices = questionsByValue[parseInt(value)];
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
    });

    // Assign questions to roulette positions based on values
    const order: number[] = new Array(12);

    this.roulettePositions.forEach((position, index) => {
      const availableQuestions = questionsByValue[position.value];
      if (availableQuestions && availableQuestions.length > 0) {
        order[index] = availableQuestions.shift()!;
      }
    });

    return order;
  }

  startGame() {
    this.gameState.update(state => ({
      ...state,
      gameStarted: true
    }));
  }

  
    spinWheel() {
    if (this.getGameState().spinning) return;

    // 1. Poner el estado en 'spinning' para que inicie la transición de CSS
    this.gameState.update(state => ({
      ...state,
      spinning: true,
      showViewQuestionButton: false,
      showQuestion: false
    }));

    this.playRouletteSound();

    // 2. Calcular la rotación final
    const targetPosition = Math.floor(Math.random() * 12);
    const targetAngle = this.roulettePositions[targetPosition].angle;

    const fullRotations = 5 + Math.random() * 3;
    const currentRotation = this.wheelRotation();
    // Aseguramos que la base de la rotación sea un múltiplo de 360 para evitar acumulaciones de ángulo
    const rotationBase = Math.ceil(currentRotation / 360) * 360;
    const finalRotation = rotationBase + (fullRotations * 360) - targetAngle;

    // 3. Asignar la rotación para que comience la animación
    this.wheelRotation.set(finalRotation);

    // 4. Después de que la animación DEBERÍA terminar...
    setTimeout(() => {
      // ---- INICIO DE LA PARTE CORREGIDA ----

      // 4A. PRIMERO, apagar la animación en el estado.
      // Esto le pide a Angular que cambie el estilo de transición a 'none'.
      this.gameState.update(state => ({
        ...state,
        spinning: false,
        selectedPosition: targetPosition,
      }));

      // 4B. AÑADIMOS UN PEQUEÑO RETRASO (10ms es suficiente)
      // Esto le da al navegador un respiro para procesar el cambio de estilo anterior.
      setTimeout(() => {
        // 4C. AHORA, con la transición ya quitada, aplicamos la corrección final.
        // Será un ajuste instantáneo e invisible.
        this.wheelRotation.set(finalRotation);

        // ---- FIN DE LA PARTE CORREGIDA ----

        // El resto de la lógica continúa aquí adentro
        this.playPointsDoubleSound();

        setTimeout(() => {
          this.gameState.update(state => ({
            ...state,
            showViewQuestionButton: true,
            showQuestion: false
          }));
        }, 1000);

      }, 10); // Un retraso mínimo es suficiente

    }, 7000); // Duración de la animación
  }



  viewQuestion() {

    this.playSuspenseSound();
    // Show the question and start timer (NO suspense sound yet)
    this.gameState.update(state => ({
      ...state,
      showViewQuestionButton: false,
      showQuestion: true,
      timeRemaining: this.timePerQuestion,
      timerActive: true
    }));

    this.showAnswer.set(false);
    this.startTimer();
  }

  revealAnswer() {
    // Stop timer first
    this.stopTimer();

    // Small delay then play drum roll and show answer
    setTimeout(() => {
      this.stopSuspenseSound();
      this.playDrumRollSound();
      this.showAnswer.set(true);
    }, 1000); // 1 second of suspense music before drum roll
  }

  markCorrect() {
    const currentQ = this.currentQuestion();
    if (!currentQ) return;

    this.playCorrectSound();

    this.gameState.update(state => {
      const newScores = [...state.scores];
      newScores[state.currentTeam] += currentQ.value;
      return {
        ...state,
        scores: newScores
      };
    });

    this.nextTurn();
  }

  markIncorrect() {
    this.playIncorrectSound();
    this.nextTurn();
  }

  nextTurn() {
    // Stop timer and any playing suspense music
    this.stopTimer();
    this.stopSuspenseSound();

    // Reset wheel to original position (0 degrees)
    this.wheelRotation.set(0);

    this.gameState.update(state => {
      const nextQuestionIndex = state.currentQuestionIndex + 1;
      const nextTeam = (state.currentTeam + 1) % this.teamCount;

      if (nextQuestionIndex >= state.questionOrder.length) {
        return {
          ...state,
          gameEnded: true,
          showQuestion: false,
          showViewQuestionButton: false,
          timeRemaining: 0,
          timerActive: false
        };
      }

      return {
        ...state,
        currentQuestionIndex: nextQuestionIndex,
        currentTeam: nextTeam,
        showQuestion: false,
        showViewQuestionButton: false,
        timeRemaining: this.timePerQuestion,
        timerActive: false
      };
    });

    this.showAnswer.set(false);
  }  goBack() {
    this.router.navigate(['/dashboard']);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private startTimer() {
    this.stopTimer(); // Clear any existing timer

    this.timerInterval = setInterval(() => {
      this.gameState.update(state => {
        const newTime = state.timeRemaining - 1;

        if (newTime <= 0) {
          // Time's up
          this.stopTimer();
          this.playTimeUpSound();
          // Auto reveal answer when time is up
          setTimeout(() => {
            if (!this.showAnswer()) {
              this.revealAnswer();
            }
          }, 1000);

          return {
            ...state,
            timeRemaining: 0,
            timerActive: false
          };
        }

        return {
          ...state,
          timeRemaining: newTime
        };
      });
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.gameState.update(state => ({
      ...state,
      timerActive: false
    }));
  }

  private playCorrectSound() {
    try {
      const audio = new Audio('/media/sound/win.mp3');
      audio.play().catch(e => console.log('Could not play sound:', e));
    } catch (e) {
      console.log('Could not play sound:', e);
    }
  }

  private playIncorrectSound() {
    try {
      const audio = new Audio('/media/sound/lose.mp3');
      audio.play().catch(e => console.log('Could not play sound:', e));
    } catch (e) {
      console.log('Could not play sound:', e);
    }
  }

  private playRouletteSound() {
    try {
      const audio = new Audio('/media/sound/ruleta.mp3');
      audio.play().catch(e => console.log('Could not play roulette sound:', e));
    } catch (e) {
      console.log('Could not play roulette sound:', e);
    }
  }

  private playPointsDoubleSound() {
    try {
      const audio = new Audio('/media/sound/puntosdobles.mp3');
      audio.play().catch(e => console.log('Could not play points double sound:', e));
    } catch (e) {
      console.log('Could not play points double sound:', e);
    }
  }

  private playSuspenseSound() {
    try {
      // Stop any existing suspense audio
      this.stopSuspenseSound();

      // Create new suspense audio with loop
      this.currentSuspenseAudio = new Audio('/media/sound/suspenso.mp3');
      this.currentSuspenseAudio.loop = true;
      this.currentSuspenseAudio.play().catch(e => console.log('Could not play suspense sound:', e));
    } catch (e) {
      console.log('Could not play suspense sound:', e);
    }
  }

  private stopSuspenseSound() {
    if (this.currentSuspenseAudio) {
      this.currentSuspenseAudio.pause();
      this.currentSuspenseAudio.currentTime = 0;
      this.currentSuspenseAudio = null;
    }
  }

  private playDrumRollSound() {
    try {
      const audio = new Audio('/media/sound/redobletambores.mp3');
      audio.play().catch(e => console.log('Could not play drum roll sound:', e));
    } catch (e) {
      console.log('Could not play drum roll sound:', e);
    }
  }

  private playTimeUpSound() {
    try {
      const audio = new Audio('/media/sound/tiempoacabado.mp3');
      audio.play().catch(e => console.log('Could not play time up sound:', e));
    } catch (e) {
      console.log('Could not play time up sound:', e);
    }
  }
}
