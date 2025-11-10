// Modelos para Quick-Thinking Game con Socket.io

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
  socketId?: string;
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
  correctAnswerIndex: number;
  scores: Player[]; // Lista completa de jugadores con puntajes actualizados
  topPlayers: Player[]; // Top jugadores de esta pregunta (ordenados por puntaje ganado)
}

export interface GameEndEvent {
  finalScores: Player[];
  winner: Player;
}

export interface TimeRemainingEvent {
  seconds: number;
  questionId?: string; // Opcional porque el backend puede no enviarlo
}

export interface PlayerEvent {
  userId: string;
  username?: string;
  message: string;
}

export interface CreateRoomResponse extends RoomState {
  // Hereda todos los campos de RoomState
}

export interface JoinRoomResponse {
  success: boolean;
  message: string;
}
