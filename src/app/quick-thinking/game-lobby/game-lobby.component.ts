import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameRoomApiService } from '../game-room-api.service';
import { QuickThinkingService } from '../quick-thinking.service';
import { BackButtonComponent } from '../../shared/back-button/back-button.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-game-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule, BackButtonComponent],
  templateUrl: './game-lobby.component.html'
})
export default class GameLobbyComponent implements OnInit, OnDestroy {
  private gameRoomApi = inject(GameRoomApiService);
  private quickThinkingService = inject(QuickThinkingService);
  private router = inject(Router);

  // Datos del formulario
  selectedQuickThinkingId = signal<string>('');
  roomTokenInput = signal<string>('');

  // Estado
  loading = signal(false);
  errorMessage = signal<string>('');

  // Lista de trivias disponibles
  quickThinkings = signal<Array<{ id: string; title: string }>>([]);

  // Toast notification
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error' | 'warning'>('success');

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    // Obtener token JWT del localStorage
    const token = localStorage.getItem('access_token');
    if (token) {
      this.quickThinkingService.connect(token);
    }

    // Cargar trivias disponibles del usuario
    this.loadQuickThinkings();

    // Check if there's a pre-selected quick-thinking from navigation state
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || history.state;
    if (state?.selectedQuickThinkingId) {
      this.selectedQuickThinkingId.set(state.selectedQuickThinkingId);
    }

    // Escuchar errores del WebSocket
    this.subscriptions.push(
      this.quickThinkingService.error$.subscribe((error) => {
        this.errorMessage.set(error.message);
        this.showToastNotification(error.message, 'error');
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadQuickThinkings(): void {
    this.quickThinkingService.getQuickThinkings().subscribe({
      next: (data) => {
        this.quickThinkings.set(data.filter(qt => qt.id).map(qt => ({ id: qt.id!, title: qt.title })));
      },
      error: (err) => {
        console.error('Error loading quick thinkings:', err);
        this.showToastNotification('Error al cargar las trivias disponibles', 'error');
      }
    });
  }

  createRoom(): void {
    const quickThinkingId = this.selectedQuickThinkingId();

    if (!quickThinkingId) {
      this.errorMessage.set('Por favor, selecciona una trivia');
      this.showToastNotification('Selecciona una trivia', 'warning');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.gameRoomApi.createRoom(quickThinkingId).subscribe({
      next: (room) => {
        console.log('✅ Sala creada:', room);
        this.showToastNotification('¡Sala creada exitosamente!', 'success');
        setTimeout(() => {
          this.router.navigate(['/quick-thinking/game-room', room.roomToken]);
        }, 500);
      },
      error: (error) => {
        console.error('❌ Error al crear sala:', error);
        const errorMsg = error.error?.message || 'Error al crear la sala. Inténtalo de nuevo.';
        this.errorMessage.set(errorMsg);
        this.showToastNotification(errorMsg, 'error');
        this.loading.set(false);
      }
    });
  }

  joinRoom(): void {
    const roomToken = this.roomTokenInput().trim();

    if (!roomToken) {
      this.errorMessage.set('Ingresa el código de sala');
      this.showToastNotification('Ingresa el código de sala', 'warning');
      return;
    }

    if (roomToken.length < 6) {
      this.errorMessage.set('El código debe tener al menos 6 caracteres');
      this.showToastNotification('El código debe tener al menos 6 caracteres', 'warning');
      return;
    }

    // Navegar directamente a la sala - el formulario de nickname se mostrará allí
    this.router.navigate(['/quick-thinking/game-room', roomToken]);
  }

  onRoomTokenInput(value: string): void {
    // Limitar a 10 caracteres máximo (por si el backend cambia el tamaño)
    this.roomTokenInput.set(value.slice(0, 10));
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
