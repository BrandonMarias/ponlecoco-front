# Guía de Implementación: Quick-Thinking en Angular

## 📋 Tabla de Contenidos
1. [Resumen del Sistema](#resumen-del-sistema)
2. [Arquitectura Backend](#arquitectura-backend)
3. [Instalación y Configuración](#instalación-y-configuración)
4. [Modelos TypeScript](#modelos-typescript)
5. [Servicios Angular](#servicios-angular)
6. [Componentes](#componentes)
7. [Flujo Completo del Juego](#flujo-completo-del-juego)
8. [Eventos WebSocket](#eventos-websocket)

---

## 🎯 Resumen del Sistema

Sistema de juego multijugador en tiempo real donde:
- ✅ **Anfitrión** crea sala y controla el flujo del juego
- ✅ **Jugadores** (máx 30) se unen usando un código de sala
- ✅ **Sistema de puntos**: 1º=300pts, 2º=200pts, 3º=100pts (basado en velocidad de respuesta correcta)
- ✅ **Timer**: 60 segundos por pregunta
- ✅ **Reconexión**: 30 segundos de gracia para reconectar sin perder estado

### Tecnologías
- **Backend**: NestJS + Socket.io + Redis (estado del juego) + PostgreSQL (plantillas)
- **Frontend**: Angular + Socket.io-client

---

## 🏗️ Arquitectura Backend

### Estado del Juego (Redis)
```typescript
GameRoomState {
  roomToken: string;              // Código de sala (6 chars)
  status: 'waiting' | 'playing' | 'finished';
  hostId: string;                 // ID del anfitrión
  gameTitle: string;              // Título del juego
  questions: GameQuestion[];      // Preguntas completas
  players: Player[];              // Jugadores activos
  answers: Answer[];              // Respuestas enviadas
  currentQuestionIndex: number;   // Índice de pregunta actual
  currentQuestionStartTime: number; // Timestamp inicio pregunta
  maxPlayers: 30;
}
```

### API REST Endpoints

#### 1. Crear Sala
```http
POST /api/quick-thinking/rooms
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "quickThinkingId": "uuid-de-plantilla"
}

Response 201:
{
  "roomToken": "A1B2C3",
  "status": "waiting",
  "hostId": "user-uuid",
  "gameTitle": "Conocimientos Generales",
  "players": [...],
  "totalQuestions": 10
}
```

#### 2. Obtener Info de Sala
```http
GET /api/quick-thinking/rooms/{roomToken}
Authorization: Bearer {jwt_token}

Response 200: GameRoomState
```

### WebSocket Namespace
```
ws://localhost:3000/quick-thinking
```

---

## 🔧 Instalación y Configuración

### 1. Instalar Dependencias
```bash
npm install socket.io-client
npm install --save-dev @types/socket.io-client
```

### 2. Configurar Environment
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'http://localhost:3000/quick-thinking'
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://tu-dominio.com/api',
  wsUrl: 'https://tu-dominio.com/quick-thinking'
};
```

---

## 📦 Modelos TypeScript

```typescript
// src/app/models/quick-thinking-game.models.ts

export enum GameRoomStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FINISHED = 'finished'
}

export interface Player {
  userId: string;
  username: string;
  score: number;
  isHost: boolean;
  socketId: string;
  isConnected: boolean;
  lastActivity?: number;
}

export interface GameQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  imageUrl?: string;
}

export interface Answer {
  questionId: string;
  userId: string;
  answerIndex: number;
  timestamp: number;
  isCorrect?: boolean;
  points?: number;
}

export interface RoomState {
  roomToken: string;
  status: GameRoomStatus;
  hostId: string;
  gameTitle: string;
  players: Player[];
  totalQuestions: number;
  currentQuestionIndex?: number;
}

export interface QuestionEvent {
  questionId: string;
  question: string;
  options: string[];
  imageUrl?: string;
  questionNumber: number;
  totalQuestions: number;
}

export interface AnswerSubmittedResponse {
  success: boolean;
  message: string;
  points: number;
  isCorrect: boolean;
}

export interface QuestionResult {
  questionId: string;
  question: string;
  correctAnswerIndex: number;
  topPlayers: Array<{
    userId: string;
    username: string;
    isCorrect: boolean;
    points: number;
    responseTime: number;
  }>;
}

export interface GameEndEvent {
  finalScores: Player[];
  winner: Player;
}

export interface TimeRemainingEvent {
  seconds: number;
}

export interface PlayerEvent {
  userId: string;
  username?: string;
  message: string;
}
```

---

## 🔌 Servicios Angular

### 1. Servicio REST API

```typescript
// src/app/services/game-room-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RoomState } from '../models/quick-thinking-game.models';

@Injectable({
  providedIn: 'root'
})
export class GameRoomApiService {
  private apiUrl = `${environment.apiUrl}/quick-thinking/rooms`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  createRoom(quickThinkingId: string): Observable<RoomState> {
    return this.http.post<RoomState>(
      this.apiUrl,
      { quickThinkingId },
      { headers: this.getHeaders() }
    );
  }

  getRoomInfo(roomToken: string): Observable<RoomState> {
    return this.http.get<RoomState>(
      `${this.apiUrl}/${roomToken}`,
      { headers: this.getHeaders() }
    );
  }
}
```

### 2. Servicio WebSocket

```typescript
// src/app/services/quick-thinking-game.service.ts
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  RoomState,
  QuestionEvent,
  QuestionResult,
  GameEndEvent,
  AnswerSubmittedResponse,
  TimeRemainingEvent,
  PlayerEvent
} from '../models/quick-thinking-game.models';

@Injectable({
  providedIn: 'root'
})
export class QuickThinkingGameService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // Subjects para eventos
  private roomStateSubject = new BehaviorSubject<RoomState | null>(null);
  private questionSubject = new Subject<QuestionEvent>();
  private questionResultsSubject = new Subject<QuestionResult>();
  private gameEndedSubject = new Subject<GameEndEvent>();
  private timeRemainingSubject = new Subject<TimeRemainingEvent>();
  private questionTimeoutSubject = new Subject<void>();
  private playerReconnectedSubject = new Subject<PlayerEvent>();
  private playerDisconnectedSubject = new Subject<PlayerEvent>();
  private errorSubject = new Subject<{ message: string }>();

  // Observables públicos
  roomState$ = this.roomStateSubject.asObservable();
  question$ = this.questionSubject.asObservable();
  questionResults$ = this.questionResultsSubject.asObservable();
  gameEnded$ = this.gameEndedSubject.asObservable();
  timeRemaining$ = this.timeRemainingSubject.asObservable();
  questionTimeout$ = this.questionTimeoutSubject.asObservable();
  playerReconnected$ = this.playerReconnectedSubject.asObservable();
  playerDisconnected$ = this.playerDisconnectedSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  connect(token: string): void {
    if (this.socket?.connected) {
      console.log('Socket ya conectado');
      return;
    }

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
      this.questionSubject.next(data);
    });

    this.socket.on('timeRemaining', (data: TimeRemainingEvent) => {
      this.timeRemainingSubject.next(data);
    });

    this.socket.on('questionTimeout', () => {
      console.log('⏰ ¡Tiempo agotado!');
      this.questionTimeoutSubject.next();
    });

    this.socket.on('questionResults', (data: QuestionResult) => {
      console.log('📈 Resultados de pregunta:', data);
      this.questionResultsSubject.next(data);
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

  joinRoom(roomToken: string, nickname?: string): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const payload = nickname ? { roomToken, nickname } : { roomToken };
      this.socket?.emit('joinRoom', payload, (response: any) => {
        resolve(response);
      });
    });
  }

  startGame(roomToken: string): void {
    this.socket?.emit('startGame', { roomToken });
  }

  launchQuestion(roomToken: string): void {
    this.socket?.emit('launchQuestion', { roomToken });
  }

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

  nextQuestion(roomToken: string): void {
    this.socket?.emit('nextQuestion', { roomToken });
  }

  getRoomState(roomToken: string): void {
    this.socket?.emit('getRoomState', { roomToken });
  }

  closeRoom(roomToken: string): void {
    this.socket?.emit('closeRoom', { roomToken });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.roomStateSubject.next(null);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}
```

---

## 🎨 Componentes

### 1. Componente de Lobby (Crear/Unirse)

```typescript
// src/app/components/game-lobby/game-lobby.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GameRoomApiService } from '../../services/game-room-api.service';
import { QuickThinkingGameService } from '../../services/quick-thinking-game.service';

@Component({
  selector: 'app-game-lobby',
  templateUrl: './game-lobby.component.html',
  styleUrls: ['./game-lobby.component.css']
})
export class GameLobbyComponent implements OnInit {
  quickThinkingId: string = '';
  roomToken: string = '';
  nickname: string = '';
  loading: boolean = false;
  errorMessage: string = '';

  constructor(
    private gameRoomApi: GameRoomApiService,
    private gameService: QuickThinkingGameService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Obtener token JWT del localStorage o servicio de auth
    const token = localStorage.getItem('access_token');
    if (token) {
      this.gameService.connect(token);
    }
  }

  createRoom(): void {
    if (!this.quickThinkingId) {
      this.errorMessage = 'Selecciona un juego';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.gameRoomApi.createRoom(this.quickThinkingId).subscribe({
      next: (room) => {
        console.log('✅ Sala creada:', room);
        this.router.navigate(['/game-room', room.roomToken]);
      },
      error: (error) => {
        console.error('❌ Error al crear sala:', error);
        this.errorMessage = error.error?.message || 'Error al crear la sala';
        this.loading = false;
      }
    });
  }

  joinRoom(): void {
    if (!this.roomToken) {
      this.errorMessage = 'Ingresa el código de sala';
      return;
    }

    if (!this.nickname.trim()) {
      this.errorMessage = 'Ingresa tu nombre o apodo';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.gameService.joinRoom(this.roomToken.toUpperCase(), this.nickname.trim()).then((response) => {
      if (response.success) {
        console.log('✅ Unido a sala:', response.message);
        // Guardar el nickname en localStorage para futuras reconexiones
        localStorage.setItem('player_nickname', this.nickname.trim());
        this.router.navigate(['/game-room', this.roomToken.toUpperCase()]);
      } else {
        this.errorMessage = response.message;
        this.loading = false;
      }
    });
  }
}
```

```html
<!-- src/app/components/game-lobby/game-lobby.component.html -->
<div class="lobby-container">
  <div class="lobby-card">
    <h1>Quick-Thinking 🎮</h1>

    <!-- Crear Sala -->
    <div class="section">
      <h2>Crear Sala</h2>
      <select [(ngModel)]="quickThinkingId" class="form-control">
        <option value="">-- Selecciona un juego --</option>
        <!-- Aquí deberías cargar las opciones desde tu API -->
        <option value="uuid-1">Conocimientos Generales</option>
        <option value="uuid-2">Historia Mundial</option>
      </select>
      <button 
        (click)="createRoom()" 
        [disabled]="loading || !quickThinkingId"
        class="btn btn-primary">
        {{ loading ? 'Creando...' : 'Crear Sala' }}
      </button>
    </div>

    <div class="divider">O</div>

    <!-- Unirse a Sala -->
    <div class="section">
      <h2>Unirse a Sala</h2>
      <input 
        type="text" 
        [(ngModel)]="nickname" 
        placeholder="Tu nombre o apodo"
        maxlength="50"
        class="form-control"
        style="margin-bottom: 10px;">
      <input 
        type="text" 
        [(ngModel)]="roomToken" 
        placeholder="Código de sala (ej: A1B2C3)"
        maxlength="6"
        class="form-control"
        (input)="roomToken = roomToken.toUpperCase()">
      <button 
        (click)="joinRoom()" 
        [disabled]="loading || !roomToken || !nickname"
        class="btn btn-success">
        {{ loading ? 'Uniéndose...' : 'Unirse' }}
      </button>
    </div>

    <!-- Error Message -->
    <div *ngIf="errorMessage" class="alert alert-danger">
      {{ errorMessage }}
    </div>
  </div>
</div>
```

### 2. Componente de Sala de Juego

```typescript
// src/app/components/game-room/game-room.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { QuickThinkingGameService } from '../../services/quick-thinking-game.service';
import {
  RoomState,
  QuestionEvent,
  QuestionResult,
  GameEndEvent,
  GameRoomStatus,
  Player
} from '../../models/quick-thinking-game.models';

@Component({
  selector: 'app-game-room',
  templateUrl: './game-room.component.html',
  styleUrls: ['./game-room.component.css']
})
export class GameRoomComponent implements OnInit, OnDestroy {
  roomToken: string = '';
  roomState: RoomState | null = null;
  currentQuestion: QuestionEvent | null = null;
  questionResults: QuestionResult | null = null;
  gameEnded: GameEndEvent | null = null;
  timeRemaining: number = 60;
  selectedAnswer: number | null = null;
  hasAnswered: boolean = false;
  showResults: boolean = false;
  
  private subscriptions: Subscription[] = [];
  
  // UI States
  GameRoomStatus = GameRoomStatus;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: QuickThinkingGameService
  ) {}

  ngOnInit(): void {
    this.roomToken = this.route.snapshot.paramMap.get('roomToken') || '';
    
    if (!this.roomToken) {
      this.router.navigate(['/lobby']);
      return;
    }

    this.setupSubscriptions();
    
    // Obtener el nickname guardado para reconexiones
    const savedNickname = localStorage.getItem('player_nickname');
    this.gameService.joinRoom(this.roomToken, savedNickname || undefined);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupSubscriptions(): void {
    // Estado de la sala
    this.subscriptions.push(
      this.gameService.roomState$.subscribe((state) => {
        this.roomState = state;
        console.log('Estado de sala:', state);
      })
    );

    // Nueva pregunta
    this.subscriptions.push(
      this.gameService.question$.subscribe((question) => {
        this.currentQuestion = question;
        this.selectedAnswer = null;
        this.hasAnswered = false;
        this.showResults = false;
        this.questionResults = null;
        this.timeRemaining = 60;
        console.log('Nueva pregunta:', question);
      })
    );

    // Timer
    this.subscriptions.push(
      this.gameService.timeRemaining$.subscribe((data) => {
        this.timeRemaining = data.seconds;
      })
    );

    // Timeout de pregunta
    this.subscriptions.push(
      this.gameService.questionTimeout$.subscribe(() => {
        console.log('⏰ Tiempo agotado');
        this.hasAnswered = true;
      })
    );

    // Resultados de pregunta
    this.subscriptions.push(
      this.gameService.questionResults$.subscribe((results) => {
        this.questionResults = results;
        this.showResults = true;
        console.log('Resultados:', results);
      })
    );

    // Fin del juego
    this.subscriptions.push(
      this.gameService.gameEnded$.subscribe((data) => {
        this.gameEnded = data;
        console.log('🏆 Juego finalizado:', data);
      })
    );

    // Errores
    this.subscriptions.push(
      this.gameService.error$.subscribe((error) => {
        alert(error.message);
        if (error.message.includes('cerrada')) {
          this.router.navigate(['/lobby']);
        }
      })
    );
  }

  get isHost(): boolean {
    const userId = this.getCurrentUserId();
    return this.roomState?.hostId === userId;
  }

  get canStartGame(): boolean {
    return this.isHost && 
           this.roomState?.status === GameRoomStatus.WAITING &&
           (this.roomState?.players.length ?? 0) >= 2;
  }

  get currentPlayer(): Player | undefined {
    const userId = this.getCurrentUserId();
    return this.roomState?.players.find(p => p.userId === userId);
  }

  private getCurrentUserId(): string {
    // Obtener del localStorage o servicio de auth
    return localStorage.getItem('user_id') || '';
  }

  startGame(): void {
    if (this.canStartGame) {
      this.gameService.startGame(this.roomToken);
    }
  }

  launchQuestion(): void {
    if (this.isHost) {
      this.gameService.launchQuestion(this.roomToken);
    }
  }

  selectAnswer(index: number): void {
    if (!this.hasAnswered && this.currentQuestion) {
      this.selectedAnswer = index;
    }
  }

  async submitAnswer(): Promise<void> {
    if (this.selectedAnswer === null || !this.currentQuestion || this.hasAnswered) {
      return;
    }

    this.hasAnswered = true;

    try {
      const response = await this.gameService.submitAnswer(
        this.roomToken,
        this.currentQuestion.questionId,
        this.selectedAnswer
      );

      console.log('Respuesta enviada:', response);
      
      if (response.success) {
        alert(`${response.isCorrect ? '✅ Correcto!' : '❌ Incorrecto'} - Puntos: ${response.points}`);
      }
    } catch (error) {
      console.error('Error al enviar respuesta:', error);
      this.hasAnswered = false;
    }
  }

  nextQuestion(): void {
    if (this.isHost) {
      this.gameService.nextQuestion(this.roomToken);
    }
  }

  closeRoom(): void {
    if (this.isHost && confirm('¿Cerrar la sala?')) {
      this.gameService.closeRoom(this.roomToken);
      this.router.navigate(['/lobby']);
    }
  }

  leaveRoom(): void {
    if (confirm('¿Salir de la sala?')) {
      this.gameService.disconnect();
      this.router.navigate(['/lobby']);
    }
  }

  copyRoomToken(): void {
    navigator.clipboard.writeText(this.roomToken);
    alert('Código copiado: ' + this.roomToken);
  }
}
```

```html
<!-- src/app/components/game-room/game-room.component.html -->
<div class="game-room-container">
  <!-- Header -->
  <div class="header">
    <div class="room-info">
      <h1>{{ roomState?.gameTitle || 'Cargando...' }}</h1>
      <div class="room-token">
        Código: <strong>{{ roomToken }}</strong>
        <button (click)="copyRoomToken()" class="btn-copy">📋 Copiar</button>
      </div>
    </div>
    <div class="actions">
      <button *ngIf="isHost" (click)="closeRoom()" class="btn btn-danger">Cerrar Sala</button>
      <button *ngIf="!isHost" (click)="leaveRoom()" class="btn btn-secondary">Salir</button>
    </div>
  </div>

  <!-- Jugadores -->
  <div class="players-section">
    <h3>Jugadores ({{ roomState?.players.length }}/30)</h3>
    <div class="players-grid">
      <div *ngFor="let player of roomState?.players" 
           class="player-card"
           [class.host]="player.isHost"
           [class.disconnected]="!player.isConnected">
        <div class="player-name">
          {{ player.username }}
          <span *ngIf="player.isHost" class="badge">👑 Anfitrión</span>
          <span *ngIf="!player.isConnected" class="badge-warning">⚠️ Desconectado</span>
        </div>
        <div class="player-score">{{ player.score }} pts</div>
      </div>
    </div>
  </div>

  <!-- Sala en Espera -->
  <div *ngIf="roomState?.status === GameRoomStatus.WAITING" class="waiting-room">
    <h2>⏳ Esperando jugadores...</h2>
    <p>Mínimo 2 jugadores para comenzar</p>
    <button 
      *ngIf="canStartGame" 
      (click)="startGame()" 
      class="btn btn-primary btn-large">
      🎮 Iniciar Juego
    </button>
    <p *ngIf="!canStartGame && isHost" class="text-muted">
      Esperando más jugadores (mín. 2)
    </p>
  </div>

  <!-- Juego en Curso -->
  <div *ngIf="roomState?.status === GameRoomStatus.PLAYING" class="game-playing">
    
    <!-- Sin pregunta activa -->
    <div *ngIf="!currentQuestion" class="waiting-question">
      <h2>⏳ Esperando siguiente pregunta...</h2>
      <button 
        *ngIf="isHost" 
        (click)="launchQuestion()" 
        class="btn btn-primary">
        🚀 Lanzar Pregunta
      </button>
    </div>

    <!-- Pregunta Activa -->
    <div *ngIf="currentQuestion && !showResults" class="question-container">
      <div class="question-header">
        <span class="question-number">
          Pregunta {{ currentQuestion.questionNumber }} / {{ currentQuestion.totalQuestions }}
        </span>
        <span class="timer" [class.urgent]="timeRemaining <= 10">
          ⏱️ {{ timeRemaining }}s
        </span>
      </div>

      <div class="question-text">
        <h2>{{ currentQuestion.question }}</h2>
        <img *ngIf="currentQuestion.imageUrl" 
             [src]="currentQuestion.imageUrl" 
             alt="Imagen de pregunta"
             class="question-image">
      </div>

      <div class="options-grid">
        <button 
          *ngFor="let option of currentQuestion.options; let i = index"
          (click)="selectAnswer(i)"
          [class.selected]="selectedAnswer === i"
          [disabled]="hasAnswered"
          class="option-btn">
          <span class="option-letter">{{ ['A', 'B', 'C', 'D'][i] }}</span>
          <span class="option-text">{{ option }}</span>
        </button>
      </div>

      <button 
        *ngIf="selectedAnswer !== null && !hasAnswered"
        (click)="submitAnswer()"
        class="btn btn-success btn-large">
        ✅ Enviar Respuesta
      </button>

      <div *ngIf="hasAnswered" class="answered-message">
        ✅ Respuesta enviada. Esperando resultados...
      </div>
    </div>

    <!-- Resultados de Pregunta -->
    <div *ngIf="showResults && questionResults" class="results-container">
      <h2>📊 Resultados</h2>
      
      <div class="correct-answer">
        <strong>Respuesta correcta:</strong> 
        {{ ['A', 'B', 'C', 'D'][questionResults.correctAnswerIndex] }} - 
        {{ currentQuestion?.options[questionResults.correctAnswerIndex] }}
      </div>

      <div class="top-players">
        <h3>🏆 Top 3</h3>
        <div *ngFor="let player of questionResults.topPlayers; let i = index" 
             class="top-player">
          <span class="rank">{{ ['🥇', '🥈', '🥉'][i] || '👤' }}</span>
          <span class="player-name">{{ player.username }}</span>
          <span class="player-points" [class.correct]="player.isCorrect">
            {{ player.isCorrect ? '+' : '' }}{{ player.points }} pts
          </span>
          <span class="response-time">{{ (player.responseTime / 1000).toFixed(2) }}s</span>
        </div>
      </div>

      <button 
        *ngIf="isHost" 
        (click)="nextQuestion()" 
        class="btn btn-primary btn-large">
        ➡️ Siguiente Pregunta
      </button>
    </div>
  </div>

  <!-- Juego Finalizado -->
  <div *ngIf="roomState?.status === GameRoomStatus.FINISHED || gameEnded" class="game-finished">
    <h1>🏆 ¡Juego Finalizado!</h1>
    
    <div *ngIf="gameEnded" class="winner">
      <h2>Ganador: {{ gameEnded.winner.username }}</h2>
      <p class="winner-score">{{ gameEnded.winner.score }} puntos</p>
    </div>

    <div class="final-scores">
      <h3>Puntuaciones Finales</h3>
      <div *ngFor="let player of gameEnded?.finalScores; let i = index" 
           class="final-player"
           [class.podium]="i < 3">
        <span class="position">{{ i + 1 }}</span>
        <span class="player-name">{{ player.username }}</span>
        <span class="player-score">{{ player.score }} pts</span>
      </div>
    </div>

    <button (click)="leaveRoom()" class="btn btn-primary btn-large">
      🏠 Volver al Lobby
    </button>
  </div>
</div>
```

---

## 🎮 Flujo Completo del Juego

### Fase 1: Creación/Unión
```
1. Usuario navega a /lobby
2. Opción A (Anfitrión):
   - Selecciona juego
   - Click "Crear Sala"
   - API REST crea sala → Redirige a /game-room/{token}
   - Su nombre viene de la base de datos (User.name)
3. Opción B (Jugador):
   - Ingresa su nombre/apodo (nickname)
   - Ingresa código de sala
   - Click "Unirse"
   - WebSocket joinRoom (con nickname) → Redirige a /game-room/{token}
```

### Fase 2: Sala de Espera
```
1. Todos los jugadores ven:
   - Lista de jugadores conectados
   - Código de sala
   - Título del juego
2. Solo el anfitrión ve:
   - Botón "Iniciar Juego" (habilitado con 2+ jugadores)
3. Anfitrión inicia → Todos reciben evento 'gameStarted'
```

### Fase 3: Juego Activo
```
Para cada pregunta:

1. Anfitrión: Click "Lanzar Pregunta"
   └─> Evento 'launchQuestion'
   
2. Todos reciben: 'newQuestion'
   - Pregunta y opciones
   - Timer de 60s comienza
   
3. Jugadores:
   - Seleccionan respuesta
   - Click "Enviar Respuesta"
   - Reciben confirmación individual
   
4. Cuando top 3 responden correctamente O todos los jugadores hayan respondido:
   - Todos reciben 'questionResults'
   - Muestran respuesta correcta y top 3
   - No se espera el timeout de 60s si todos ya respondieron
   
5. Anfitrión: Click "Siguiente Pregunta"
   - Si hay más preguntas → Repetir desde paso 1
   - Si no hay más → Fin del juego
```

### Fase 4: Finalización
```
1. Todos reciben: 'gameEnded'
   - Puntuaciones finales ordenadas
   - Ganador destacado
   
2. Jugadores: Click "Volver al Lobby"
   - Desconexión WebSocket
   - Navegación a /lobby
```

---

## 📡 Eventos WebSocket

### Cliente → Servidor

| Evento | Payload | Quién puede usarlo | Descripción |
|--------|---------|-------------------|-------------|
| `joinRoom` | `{ roomToken: string, nickname?: string }` | Todos | Unirse a sala (nickname requerido para jugadores) |
| `startGame` | `{ roomToken: string }` | Solo anfitrión | Iniciar juego |
| `launchQuestion` | `{ roomToken: string }` | Solo anfitrión | Lanzar pregunta actual |
| `submitAnswer` | `{ roomToken, questionId, answerIndex }` | Todos | Enviar respuesta |
| `nextQuestion` | `{ roomToken: string }` | Solo anfitrión | Avanzar a siguiente pregunta |
| `getRoomState` | `{ roomToken: string }` | Todos | Solicitar estado actual |
| `closeRoom` | `{ roomToken: string }` | Solo anfitrión | Cerrar sala |

### Servidor → Cliente

| Evento | Payload | Cuándo se emite | Descripción |
|--------|---------|----------------|-------------|
| `roomState` | `RoomState` | Al unirse o cambiar estado | Estado actualizado de sala |
| `gameStarted` | `RoomState` | Al iniciar juego | Confirmación de inicio |
| `newQuestion` | `QuestionEvent` | Al lanzar pregunta | Nueva pregunta disponible |
| `timeRemaining` | `{ seconds: number }` | Cada segundo durante pregunta | Cuenta regresiva |
| `questionTimeout` | `{}` | Cuando expira el timer | Tiempo agotado |
| `answerSubmitted` | `AnswerSubmittedResponse` | Al enviar respuesta | Confirmación individual |
| `questionResults` | `QuestionResult` | Top 3 responden correctamente O todos los jugadores respondieron | Resultados de pregunta |
| `readyForNextQuestion` | `{}` | Al avanzar pregunta | Listo para siguiente |
| `gameEnded` | `GameEndEvent` | Al finalizar última pregunta | Puntuaciones finales |
| `playerReconnected` | `PlayerEvent` | Al reconectar en 30s | Jugador reconectado |
| `playerTemporarilyDisconnected` | `PlayerEvent` | Al desconectar temporalmente | Desconexión temporal |
| `playerDisconnected` | `PlayerEvent` | Después de 30s desconectado | Desconexión permanente |
| `roomClosed` | `{ message: string }` | Al cerrar sala | Sala cerrada por anfitrión |
| `error` | `{ message: string }` | En errores | Mensaje de error |

---

## 🎯 Checklist de Implementación

### Setup Inicial
- [ ] Instalar `socket.io-client`
- [ ] Configurar `environment.ts` con URLs
- [ ] Crear carpeta `models/` con interfaces

### Servicios
- [ ] Crear `game-room-api.service.ts` (REST)
- [ ] Crear `quick-thinking-game.service.ts` (WebSocket)
- [ ] Implementar manejo de reconexión
- [ ] Implementar todos los eventos

### Componentes
- [ ] Crear `game-lobby.component` (crear/unirse)
- [ ] Agregar campo de nickname en formulario de unirse
- [ ] Validar que el nickname no esté vacío
- [ ] Guardar nickname en localStorage para reconexiones
- [ ] Crear `game-room.component` (sala principal)
- [ ] Implementar lógica de anfitrión vs jugador
- [ ] Implementar timer visual
- [ ] Implementar mostrar resultados
- [ ] Implementar pantalla de fin de juego

### Routing
- [ ] Configurar ruta `/lobby`
- [ ] Configurar ruta `/game-room/:roomToken`
- [ ] Agregar guards si es necesario

### Estilos
- [ ] CSS para lobby
- [ ] CSS para sala de espera
- [ ] CSS para preguntas y opciones
- [ ] CSS para resultados
- [ ] CSS responsive para móviles

### Testing
- [ ] Probar crear sala
- [ ] Probar unirse con código
- [ ] Probar flujo completo con 2+ jugadores
- [ ] Probar reconexión
- [ ] Probar timeout de preguntas
- [ ] Probar finalización del juego

---

## 🚨 Consideraciones Importantes

### Seguridad
- ✅ JWT token requerido en WebSocket y REST
- ✅ Validaciones en backend (solo anfitrión puede controlar)
- ✅ No se expone `correctAnswerIndex` hasta después de responder

### Performance
- ✅ Redis maneja el estado (ultra-rápido)
- ✅ WebSocket para actualizaciones en tiempo real
- ✅ Límite de 30 jugadores por sala

### UX
- ✅ Reconexión automática (30s de gracia)
- ✅ Notificaciones de jugadores desconectados
- ✅ Timer visual de cuenta regresiva
- ✅ Feedback inmediato al responder
- ✅ Finalización automática de ronda cuando todos responden (no espera timeout)

### Errores Comunes
- ❌ Token JWT expirado → Relogin
- ❌ Sala llena (30 jugadores) → Mensaje de error
- ❌ Sala no encontrada → Verificar código
- ❌ Solo anfitrión puede iniciar → UI diferenciada
- ❌ Nickname vacío al unirse → Validación requerida

---

## 📚 Recursos Adicionales

### Documentación
- Socket.io Client: https://socket.io/docs/v4/client-api/
- Angular HttpClient: https://angular.io/api/common/http/HttpClient
- RxJS Observables: https://rxjs.dev/guide/observable

### Debugging
```typescript
// Activar logs de Socket.io
const socket = io(url, {
  auth: { token },
  transports: ['websocket'],
  debug: true // ← Agregar en desarrollo
});

// Ver eventos en consola
socket.onAny((eventName, ...args) => {
  console.log(`[WS] ${eventName}:`, args);
});
```

---

**¡Implementación completa lista para usar! 🚀**
