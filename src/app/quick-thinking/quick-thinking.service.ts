import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { QuickThinking } from './quick-thinking';
import { Observable, map, Subject, BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import {
  RoomState,
  QuestionEvent,
  QuestionResult,
  GameEndEvent,
  AnswerSubmittedResponse,
  TimeRemainingEvent,
  PlayerEvent,
  JoinRoomResponse
} from './quick-thinking-game.models';

interface ImageUploadData {
  imageUrl: string;
}

interface ApiImageUploadResponse {
  success: boolean;
  message: string;
  data: ImageUploadData;
}

@Injectable({
  providedIn: 'root',
})
export class QuickThinkingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/quick-thinking`;

  // WebSocket properties
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // Subjects para eventos WebSocket
  private roomStateSubject = new BehaviorSubject<RoomState | null>(null);
  private questionSubject = new Subject<QuestionEvent>();
  private questionResultsSubject = new Subject<QuestionResult>();
  private gameEndedSubject = new Subject<GameEndEvent>();
  private timeRemainingSubject = new BehaviorSubject<TimeRemainingEvent | null>(null);
  private questionTimeoutSubject = new Subject<void>();
  private readyForNextQuestionSubject = new Subject<void>();
  private playerReconnectedSubject = new Subject<PlayerEvent>();
  private playerDisconnectedSubject = new Subject<PlayerEvent>();
  private errorSubject = new Subject<{ message: string }>();
  
  // Control del timer - se reinicia con cada nueva pregunta
  private currentQuestionId: string | null = null;
  private isTimerActive = false;

  // Observables públicos para WebSocket
  roomState$ = this.roomStateSubject.asObservable();
  question$ = this.questionSubject.asObservable();
  questionResults$ = this.questionResultsSubject.asObservable();
  gameEnded$ = this.gameEndedSubject.asObservable();
  // timeRemaining$ se mantiene actualizado porque BehaviorSubject permite acceso al valor actual
  get timeRemaining$() {
    return this.timeRemainingSubject.asObservable();
  }
  questionTimeout$ = this.questionTimeoutSubject.asObservable();
  readyForNextQuestion$ = this.readyForNextQuestionSubject.asObservable();
  playerReconnected$ = this.playerReconnectedSubject.asObservable();
  playerDisconnected$ = this.playerDisconnectedSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  // Get all quick thinking trivias for the user
  getQuickThinkings() {
    return this.http.get<QuickThinking[]>(this.apiUrl);
  }

  // Get a specific quick thinking by ID
  getQuickThinkingById(id: string) {
    return this.http.get<QuickThinking>(`${this.apiUrl}/${id}`);
  }

  // Create a new quick thinking trivia
  createQuickThinking(quickThinkingData: Omit<QuickThinking, 'id' | 'userId'>) {
    return this.http.post<QuickThinking>(this.apiUrl, quickThinkingData);
  }

  // Update an existing quick thinking trivia
  updateQuickThinking(id: string, quickThinkingData: Partial<Omit<QuickThinking, 'id' | 'userId'>>) {
    return this.http.patch<QuickThinking>(`${this.apiUrl}/${id}`, quickThinkingData);
  }

  // Delete a quick thinking trivia
  deleteQuickThinking(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Upload an image for a question
  uploadQuestionImage(image: File): Observable<ImageUploadData> {
    const formData = new FormData();
    formData.append('image', image);

    return this.http
      .post<ApiImageUploadResponse>(
        `${this.apiUrl}/question-image`,
        formData
      )
      .pipe(
        map((response) => {
          return response.data;
        })
      );
  }

  // Generate quick thinking questions with AI
  generateQuickThinkingWithAI(params: { topic?: string; text?: string }): Observable<{ title: string; questions: any[] }> {
    return this.http.post<{ title: string; questions: any[] }>(`${environment.apiUrl}/ai/quick-thinking`, params);
  }

  // Share/Unshare quick thinking
  toggleShareQuickThinking(id: string, isShared: boolean): Observable<QuickThinking> {
    return this.http.patch<QuickThinking>(`${this.apiUrl}/${id}/shared`, { isShared });
  }

  // Get public quick thinking
  getPublicQuickThinking(id: string): Observable<QuickThinking> {
    return this.http.get<QuickThinking>(`${environment.apiUrl}/public/quick-thinking/${id}`);
  }

  // Generate unique share link
  generateShareLink(id: string): Observable<{ token: string; expiresAt: string }> {
    return this.http.post<{ token: string; expiresAt: string }>(`${this.apiUrl}/${id}/share-link`, {});
  }

  // Get quick thinking by token
  getQuickThinkingByToken(token: string): Observable<QuickThinking> {
    return this.http.get<QuickThinking>(`${this.apiUrl}/shared/${token}`);
  }

  // ==================== WebSocket Methods ====================

  /**
   * Conecta al servidor WebSocket para juegos en tiempo real
   * @param token Token JWT del usuario autenticado
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      console.log('✅ Socket ya conectado, reutilizando conexión existente');
      return;
    }

    // Si hay un socket pero no está conectado, limpiarlo primero
    if (this.socket) {
      console.log('🔄 Limpiando socket desconectado antes de crear uno nuevo');
      this.socket.removeAllListeners();
      this.socket.close();
      this.socket = null;
    }

    console.log('🔌 Conectando al servidor WebSocket...');
    this.socket = io(environment.wsUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      transports: ['websocket', 'polling']
    });

    this.setupListeners();
  }

  /**
   * Configura los listeners para todos los eventos del WebSocket
   */
  private setupListeners(): void {
    if (!this.socket) return;

    // Eventos de conexión
    this.socket.on('connect', () => {
      console.log('✅ Conectado al servidor WebSocket');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Desconectado del servidor:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.errorSubject.next({
          message: 'No se pudo conectar al servidor. Intenta recargar la página.'
        });
      }
    });

    // Eventos del juego
    this.socket.on('roomState', (data: RoomState) => {
      console.log('📊 Estado de sala actualizado:', data);
      this.roomStateSubject.next(data);
    });

    this.socket.on('gameStarted', (data: RoomState) => {
      console.log('🎮 Juego iniciado:', data);
      this.roomStateSubject.next(data);
    });

    this.socket.on('newQuestion', (data: QuestionEvent) => {
      console.log('❓ Nueva pregunta:', data);
      
      // 🔥 CRÍTICO: Detener timer anterior y crear uno nuevo
      this.stopTimer();
      this.startTimer();
      
      // Actualizar ID de pregunta actual
      this.currentQuestionId = data.questionId;
      console.log('🔄 Timer reseteado para pregunta:', this.currentQuestionId);
      
      this.questionSubject.next(data);
    });

    this.socket.on('timeRemaining', (data: TimeRemainingEvent) => {
      // Solo emitir si el timer está activo
      if (this.isTimerActive) {
        this.timeRemainingSubject.next(data);
      } else {
        console.log('⚠️ Timer ignorado - timer inactivo');
      }
    });

    this.socket.on('questionTimeout', () => {
      console.log('⏰ ¡Tiempo agotado!');
      this.stopTimer(); // Detener timer
      this.questionTimeoutSubject.next();
    });

    this.socket.on('questionResults', (data: QuestionResult) => {
      console.log('📈 Resultados de pregunta:', data);
      this.stopTimer(); // Detener timer cuando se muestran resultados
      this.questionResultsSubject.next(data);
    });

    this.socket.on('readyForNextQuestion', () => {
      console.log('✅ Listo para siguiente pregunta');
      this.readyForNextQuestionSubject.next();
    });

    this.socket.on('gameEnded', (data: GameEndEvent) => {
      console.log('🏆 Juego finalizado:', data);
      this.gameEndedSubject.next(data);
    });

    this.socket.on('playerReconnected', (data: PlayerEvent) => {
      console.log('🔄 Jugador reconectado:', data);
      this.playerReconnectedSubject.next(data);
    });

    this.socket.on('playerTemporarilyDisconnected', (data: PlayerEvent) => {
      console.log('⚠️ Jugador desconectado temporalmente:', data);
      this.playerDisconnectedSubject.next(data);
    });

    this.socket.on('playerDisconnected', (data: PlayerEvent) => {
      console.log('👋 Jugador desconectado:', data);
      this.playerDisconnectedSubject.next(data);
    });

    this.socket.on('roomClosed', (data: { message: string }) => {
      console.log('🚪 Sala cerrada:', data.message);
      this.errorSubject.next({ message: data.message });
    });

    this.socket.on('error', (data: { message: string }) => {
      console.error('❌ Error del servidor:', data.message);
      this.errorSubject.next(data);
    });
  }

  /**
   * Unirse a una sala de juego
   * @param roomToken Código de la sala
   * @param nickname Nombre o apodo del jugador (opcional para usuarios autenticados)
   * @returns Promise con la respuesta de unirse a la sala
   */
  joinRoom(roomToken: string, nickname?: string): Promise<JoinRoomResponse> {
    return new Promise((resolve) => {
      const payload = nickname ? { roomToken, nickname } : { roomToken };
      console.log('📤 Enviando joinRoom con payload:', payload);
      this.socket?.emit('joinRoom', payload, (response: JoinRoomResponse) => {
        console.log('📥 Respuesta de joinRoom:', response);
        resolve(response);
      });
    });
  }

  /**
   * Iniciar el juego (solo anfitrión)
   * @param roomToken Código de la sala
   */
  startGame(roomToken: string): void {
    this.socket?.emit('startGame', { roomToken });
  }

  /**
   * Lanzar la siguiente pregunta (solo anfitrión)
   * @param roomToken Código de la sala
   */
  launchQuestion(roomToken: string): void {
    this.socket?.emit('launchQuestion', { roomToken });
  }

  /**
   * Enviar respuesta a una pregunta
   * @param roomToken Código de la sala
   * @param questionId ID de la pregunta
   * @param answerIndex Índice de la respuesta seleccionada (0-3)
   * @returns Promise con la respuesta del servidor
   */
  submitAnswer(
    roomToken: string,
    questionId: string,
    answerIndex: number
  ): Promise<AnswerSubmittedResponse> {
    return new Promise((resolve) => {
      this.socket?.emit(
        'submitAnswer',
        { roomToken, questionId, answerIndex },
        (response: AnswerSubmittedResponse) => {
          resolve(response);
        }
      );
    });
  }

  /**
   * Avanzar a la siguiente pregunta (solo anfitrión)
   * @param roomToken Código de la sala
   */
  nextQuestion(roomToken: string): void {
    this.socket?.emit('nextQuestion', { roomToken });
  }

  /**
   * Obtener el estado actual de la sala
   * @param roomToken Código de la sala
   */
  getRoomState(roomToken: string): void {
    this.socket?.emit('getRoomState', { roomToken });
  }

  /**
   * Cerrar la sala (solo anfitrión)
   * @param roomToken Código de la sala
   */
  closeRoom(roomToken: string): void {
    this.socket?.emit('closeRoom', { roomToken });
  }

  /**
   * Inicia el timer para la pregunta actual
   */
  private startTimer(): void {
    this.isTimerActive = true;
    console.log('⏰ Timer ACTIVADO');
  }

  /**
   * Detiene el timer actual
   */
  private stopTimer(): void {
    if (this.isTimerActive) {
      console.log('⏹️ Timer DESACTIVADO');
      this.isTimerActive = false;
      this.currentQuestionId = null;
      
      // Resetear el BehaviorSubject a null para indicar que no hay timer activo
      this.timeRemainingSubject.next(null);
    }
  }

  /**
   * Desconectar del WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.stopTimer(); // Detener timer antes de desconectar
      this.socket.disconnect();
      this.socket = null;
      this.roomStateSubject.next(null);
    }
  }

  /**
   * Verificar si está conectado al WebSocket
   * @returns true si está conectado, false en caso contrario
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}
