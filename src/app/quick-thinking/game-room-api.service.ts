import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RoomState, CreateRoomResponse } from './quick-thinking-game.models';

@Injectable({
  providedIn: 'root'
})
export class GameRoomApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/quick-thinking/rooms`;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Crea una nueva sala de juego
   * @param quickThinkingId ID del QuickThinking que se jugará
   * @returns Observable con la información de la sala creada
   */
  createRoom(quickThinkingId: string): Observable<CreateRoomResponse> {
    return this.http.post<CreateRoomResponse>(
      this.apiUrl,
      { quickThinkingId },
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtiene información de una sala existente
   * @param roomToken Código de la sala
   * @returns Observable con el estado actual de la sala
   */
  getRoomInfo(roomToken: string): Observable<RoomState> {
    return this.http.get<RoomState>(
      `${this.apiUrl}/${roomToken}`,
      { headers: this.getHeaders() }
    );
  }
}
