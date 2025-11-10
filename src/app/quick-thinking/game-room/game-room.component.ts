import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { QuickThinkingService } from '../quick-thinking.service';
import { GameRoomApiService } from '../game-room-api.service';
import {
  RoomState,
  QuestionEvent,
  QuestionResult,
  GameEndEvent,
  GameRoomStatus,
  Player,
  TimeRemainingEvent
} from '../quick-thinking-game.models';
import { ModalService } from '../../shared/modal.service';
import QRCode from 'qrcode';

@Component({
  selector: 'app-game-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './game-room.component.html'
})
export default class GameRoomComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  router = inject(Router); // Público para usar en template
  private gameService = inject(QuickThinkingService);
  private gameRoomApiService = inject(GameRoomApiService);
  private modalService = inject(ModalService);

  // Room state
  roomToken = signal<string>('');
  roomState = signal<RoomState | null>(null);
  currentQuestion = signal<QuestionEvent | null>(null);
  questionResults = signal<QuestionResult | null>(null);
  gameEnded = signal<GameEndEvent | null>(null);

  // UI state
  timeRemaining = signal<number>(60);
  selectedAnswer = signal<number | null>(null);
  hasAnswered = signal<boolean>(false);
  showResults = signal<boolean>(false);

  // Nickname state (para usuarios que llegan por link directo)
  showNicknameForm = signal<boolean>(false);
  nicknameInput = signal<string>('');
  joiningRoom = signal<boolean>(false);

  // Enums for template
  GameRoomStatus = GameRoomStatus;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // Timer subscription separada para poder recrearla
  private timerSubscription: Subscription | null = null;

  // Toast notification
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error' | 'warning'>('success');

  // QR Code
  qrCodeDataUrl = signal<string>('');
  showShareModal = signal(false);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('roomToken');
    console.log('🎫 Room token from route:', token);

    if (!token) {
      console.warn('⚠️ No room token found, redirecting to lobby');
      this.router.navigate(['/quick-thinking/lobby']);
      return;
    }

    this.roomToken.set(token);
    console.log('✅ Room token set:', token);

    // Generate QR code immediately
    this.generateQRCode(token);

    // Connect to WebSocket if not connected
    const jwtToken = localStorage.getItem('access_token');
    console.log('🔑 JWT Token exists:', !!jwtToken);

    if (jwtToken) {
      // Conectar WebSocket si no está conectado
      if (!this.gameService.isConnected()) {
        console.log('🔌 Conectando al WebSocket...');
        this.gameService.connect(jwtToken);
      } else {
        console.log('✅ WebSocket ya conectado');
      }

      // Setup subscriptions first
      this.setupSubscriptions();

      // Verificar que la sala existe antes de unirse por WebSocket
      this.verifyAndJoinRoom(token);
    } else {
      console.error('❌ No hay token JWT disponible');
      this.showToastNotification('Error de autenticación', 'error');

      // Save current URL for redirect after login
      const currentPath = window.location.hash.replace('#', '');
      if (currentPath) {
        localStorage.setItem('returnUrl', currentPath);
        console.log('💾 Saved returnUrl:', currentPath);
      }

      this.router.navigate(['/auth/login']);
    }
  }

  private verifyAndJoinRoom(token: string): void {
    console.log('🔍 Verificando sala con API REST...');

    // Primero verificar que la sala existe usando API REST
    this.gameRoomApiService.getRoomInfo(token).subscribe({
      next: (roomInfo) => {
        console.log('✅ Sala verificada:', roomInfo);
        // La sala existe, actualizar estado local
        this.roomState.set(roomInfo);

        // Verificar si el usuario es el host (usuario autenticado)
        const jwtToken = localStorage.getItem('access_token');
        const isHost = !!jwtToken && roomInfo.hostId === this.getCurrentUserId();

        if (!isHost) {
          // No es host: SIEMPRE mostrar formulario de nickname
          console.log('❓ Usuario no es host, mostrando formulario de nickname');
          this.showNicknameForm.set(true);
        } else {
          // Es host: unirse directamente sin nickname
          console.log('✅ Usuario es host, uniéndose directamente');
          setTimeout(() => {
            this.joinGameRoom(token);
          }, 500);
        }
      },
      error: (error) => {
        console.error('❌ Error al verificar sala:', error);
        const errorMsg = error.error?.message || 'Sala no encontrada o expirada';
        this.showToastNotification(errorMsg, 'error');

        // Redirigir al lobby después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/quick-thinking/lobby']);
        }, 2000);
      }
    });
  }

  private joinGameRoom(token: string): void {
    console.log('🚪 Uniéndose a sala por WebSocket...');

    // Si hay un nickname en el signal (viene del formulario), usarlo
    // Si no, es el host y no necesita nickname
    const nickname = this.nicknameInput().trim() || undefined;
    console.log('👤 Nickname para unirse:', nickname || '(host sin nickname)');

    this.gameService.joinRoom(token, nickname).then(response => {
      console.log('✅ Join room response:', response);
      if (!response.success) {
        console.warn('⚠️ Error al unirse:', response.message);
        this.showToastNotification(response.message, 'warning');

        // Si falla, intentar obtener el estado directamente
        console.log('🔄 Intentando obtener estado de sala...');
        this.gameService.getRoomState(token);
      } else {
        console.log('✅ Unido exitosamente a la sala');
      }
    }).catch(error => {
      console.error('❌ Error joining room:', error);
      this.showToastNotification('Error al unirse a la sala', 'error');

      // Intentar obtener el estado como fallback
      this.gameService.getRoomState(token);
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  private setupSubscriptions(): void {
    // Estado de la sala
    this.subscriptions.push(
      this.gameService.roomState$.subscribe((state) => {
        this.roomState.set(state);
        console.log('Estado de sala:', state);
      })
    );

    // Nueva pregunta - resetear estado y recrear timer subscription
    this.subscriptions.push(
      this.gameService.question$.subscribe((question) => {
        console.log('❓ Nueva pregunta recibida en componente:', question.questionId.substring(0, 8));

        // Resetear todo el estado de la pregunta
        this.currentQuestion.set(question);
        this.selectedAnswer.set(null);
        this.hasAnswered.set(false);
        this.showResults.set(false);
        this.questionResults.set(null);
        this.timeRemaining.set(60); // Reset visual del timer

        // 🔥 CRÍTICO: Recrear subscription del timer
        console.log('🔄 Llamando a setupTimerSubscription para nueva pregunta...');
        this.setupTimerSubscription();

        console.log('✅ Estado reseteado para nueva pregunta');
      })
    );

    // Configurar timer subscription inicial
    this.setupTimerSubscription();

    // Timeout de pregunta
    this.subscriptions.push(
      this.gameService.questionTimeout$.subscribe(() => {
        console.log('⏰ Tiempo agotado');
        this.hasAnswered.set(true);
      })
    );

    // Resultados de pregunta
    this.subscriptions.push(
      this.gameService.questionResults$.subscribe((results) => {
        this.questionResults.set(results);
        this.showResults.set(true);
        console.log('📊 Resultados recibidos:', results);

        // Actualizar los scores de los jugadores en el roomState
        if (results.scores && this.roomState()) {
          const currentState = this.roomState()!;
          const updatedPlayers = currentState.players.map(player => {
            const updatedScore = results.scores.find(s => s.userId === player.userId);
            if (updatedScore) {
              return { ...player, score: updatedScore.score };
            }
            return player;
          });

          this.roomState.set({
            ...currentState,
            players: updatedPlayers
          });

          console.log('✅ Scores actualizados en roomState:', updatedPlayers);
        }
      })
    );

    // Fin del juego
    this.subscriptions.push(
      this.gameService.gameEnded$.subscribe((data) => {
        this.gameEnded.set(data);
        console.log('🏆 Juego finalizado:', data);
      })
    );

    // Listo para siguiente pregunta
    this.subscriptions.push(
      this.gameService.readyForNextQuestion$.subscribe(() => {
        console.log('✅ Backend listo para siguiente pregunta');
        // Si eres el host, lanzar la pregunta automáticamente
        if (this.isHost) {
          console.log('🚀 Auto-lanzando siguiente pregunta...');
          setTimeout(() => {
            this.gameService.launchQuestion(this.roomToken());
          }, 300);
        }
      })
    );

    // Reconexiones
    this.subscriptions.push(
      this.gameService.playerReconnected$.subscribe((player) => {
        this.showToastNotification(`${player.username || 'Un jugador'} se ha reconectado`, 'success');
      })
    );

    this.subscriptions.push(
      this.gameService.playerDisconnected$.subscribe((player) => {
        this.showToastNotification(`${player.username || 'Un jugador'} se ha desconectado`, 'warning');
      })
    );

    // Errores
    this.subscriptions.push(
      this.gameService.error$.subscribe((error) => {
        this.showToastNotification(error.message, 'error');
        if (error.message.includes('cerrada')) {
          setTimeout(() => {
            this.router.navigate(['/quick-thinking/lobby']);
          }, 2000);
        }
      })
    );
  }

  /**
   * Configura/recrea la subscription del timer
   * Se llama al inicio y cada vez que hay una nueva pregunta
   */
  private setupTimerSubscription(): void {
    console.log('🔧 setupTimerSubscription llamado');

    // Limpiar subscription anterior si existe
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
      console.log('🔄 Timer subscription anterior desuscrita');
    }

    // Crear nueva subscription filtrando valores null
    this.timerSubscription = this.gameService.timeRemaining$
      .pipe(
        filter((data): data is TimeRemainingEvent => data !== null)
      )
      .subscribe({
        next: (data) => {
          this.timeRemaining.set(data.seconds);
        },
        complete: () => {
          console.log('⏹️ Timer subject completado en componente');
        }
      });

    console.log('⏰ Nueva timer subscription creada');
  }

  get isHost(): boolean {
    const userId = this.getCurrentUserId();
    return this.roomState()?.hostId === userId;
  }

  get canStartGame(): boolean {
    return this.isHost &&
           this.roomState()?.status === GameRoomStatus.WAITING &&
           (this.getActivePlayers().length) >= 2;
  }

  get currentPlayer(): Player | undefined {
    const userId = this.getCurrentUserId();
    return this.roomState()?.players.find(p => p.userId === userId);
  }

  /**
   * Obtiene solo los jugadores activos (excluye al host)
   * El host solo controla eventos, no juega
   */
  getActivePlayers(): Player[] {
    if (!this.roomState()?.players) return [];
    return this.roomState()!.players.filter(player => !player.isHost);
  }

  /**
   * Obtiene el ranking de jugadores desde scores, excluyendo al host
   * y ordenados por puntaje descendente
   */
  getTopPlayersFromScores(scores: Player[]): Player[] {
    if (!scores || scores.length === 0) return [];

    return scores
      .filter(player => !player.isHost) // Excluir host
      .sort((a, b) => b.score - a.score); // Ordenar por puntaje descendente
  }

  private getCurrentUserId(): string {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.id || '';
      } catch (e) {
        return '';
      }
    }
    return '';
  }

  /**
   * Manejar el submit del formulario de nickname
   */
  submitNickname(): void {
    const nickname = this.nicknameInput().trim();

    if (!nickname) {
      this.showToastNotification('Ingresa tu nombre o apodo', 'warning');
      return;
    }

    if (nickname.length < 2) {
      this.showToastNotification('El nombre debe tener al menos 2 caracteres', 'warning');
      return;
    }

    if (nickname.length > 20) {
      this.showToastNotification('El nombre no puede tener más de 20 caracteres', 'warning');
      return;
    }

    // NO guardar en localStorage - solo usar para esta sesión
    console.log('� Nickname ingresado (no se guarda):', nickname);

    // Ocultar formulario y unirse a la sala
    this.showNicknameForm.set(false);
    this.joiningRoom.set(true);

    setTimeout(() => {
      this.joinGameRoom(this.roomToken());
    }, 300);
  }

  startGame(): void {
    if (this.canStartGame) {
      this.gameService.startGame(this.roomToken());
    }
  }

  launchQuestion(): void {
    if (this.isHost) {
      this.gameService.launchQuestion(this.roomToken());
    }
  }

  selectAnswer(index: number): void {
    if (!this.hasAnswered() && this.currentQuestion()) {
      this.selectedAnswer.set(index);
    }
  }

  async submitAnswer(): Promise<void> {
    const answer = this.selectedAnswer();
    const question = this.currentQuestion();

    if (answer === null || !question || this.hasAnswered()) {
      return;
    }

    this.hasAnswered.set(true);

    try {
      const response = await this.gameService.submitAnswer(
        this.roomToken(),
        question.questionId,
        answer
      );

      console.log('Respuesta enviada:', response);

      if (response.success) {
        const message = response.isCorrect
          ? `✅ ¡Correcto! +${response.points} puntos`
          : `❌ Incorrecto`;
        this.showToastNotification(message, response.isCorrect ? 'success' : 'error');
      }
    } catch (error) {
      console.error('Error al enviar respuesta:', error);
      this.hasAnswered.set(false);
      this.showToastNotification('Error al enviar respuesta', 'error');
    }
  }

  nextQuestion(): void {
    if (this.isHost) {
      console.log('⏭️ Solicitando avanzar a siguiente pregunta...');
      // Solo avanzar - el evento 'readyForNextQuestion' lanzará la pregunta
      this.gameService.nextQuestion(this.roomToken());
    }
  }

  async closeRoom(): Promise<void> {
    const confirmed = await this.modalService.open({
      title: 'Cerrar Sala',
      message: '¿Estás seguro de que quieres cerrar la sala? Todos los jugadores serán expulsados.'
    });

    if (confirmed) {
      this.gameService.closeRoom(this.roomToken());
      this.router.navigate(['/quick-thinking/lobby']);
    }
  }

  async leaveRoom(): Promise<void> {
    const confirmed = await this.modalService.open({
      title: 'Salir de la Sala',
      message: '¿Estás seguro de que quieres salir de la sala?'
    });

    if (confirmed) {
      this.gameService.disconnect();
      this.router.navigate(['/quick-thinking/lobby']);
    }
  }

  copyRoomToken(): void {
    navigator.clipboard.writeText(this.roomToken());
    this.showToastNotification('Código copiado al portapapeles', 'success');
  }

  async generateQRCode(roomToken: string): Promise<void> {
    try {
      const joinUrl = this.getJoinUrl(roomToken);
      const qrDataUrl = await QRCode.toDataURL(joinUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      this.qrCodeDataUrl.set(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

  getJoinUrl(roomToken: string): string {
    const baseUrl = window.location.origin;
    // Asegurar que siempre incluya el # para hash routing
    return `${baseUrl}/#/quick-thinking/game-room/${roomToken}`;
  }

  copyJoinLink(): void {
    const url = this.getJoinUrl(this.roomToken());
    navigator.clipboard.writeText(url);
    this.showToastNotification('Enlace copiado al portapapeles', 'success');
  }

  async shareJoinLink(): Promise<void> {
    const url = this.getJoinUrl(this.roomToken());
    const title = `Únete a ${this.roomState()?.gameTitle || 'Quick-Thinking'}`;
    const text = `¡Únete a mi sala de Quick-Thinking! Código: ${this.roomToken()}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        this.showToastNotification('Compartido exitosamente', 'success');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      // Fallback to copying link
      this.copyJoinLink();
    }
  }

  toggleShareModal(): void {
    this.showShareModal.set(!this.showShareModal());
  }

  getOptionLetter(index: number): string {
    return ['A', 'B', 'C', 'D'][index];
  }

  getRankEmoji(index: number): string {
    return ['🥇', '🥈', '🥉'][index] || '👤';
  }

  showToastNotification(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    this.showToast.set(true);

    setTimeout(() => {
      this.showToast.set(false);
    }, 3000);
  }
}
