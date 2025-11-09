import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../shared/header/header.component';
import { TriviaPartyService } from '../triviaparty/triviaparty.service';
import { TriviaParty } from '../triviaparty/triviaparty';
import { RouletteService } from '../roulette/roulette.service';
import { Roulette } from '../roulette/roulette';
import { QuickThinkingService } from '../quick-thinking/quick-thinking.service';
import { QuickThinking } from '../quick-thinking/quick-thinking';
import { GameRoomApiService } from '../quick-thinking/game-room-api.service';
import { ModalService } from '../shared/modal.service';
import { forkJoin } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ShareModalComponent } from '../shared/share-modal/share-modal.component';
import { environment } from '../../environments/environment';

// Unified interface for dashboard items
interface DashboardItem {
  id: string;
  title: string;
  type: 'triviaparty' | 'ruleta' | 'quick-thinking';
  gameType?: 'triviaparty' | 'ruleta' | 'quick-thinking'; // For TriviaParty items that can be either type
  isShared?: boolean; // Track if item is publicly shared
  createdAt?: string; // Creation date for sorting
  updatedAt?: string; // Update date
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HeaderComponent, FormsModule, ShareModalComponent],
  templateUrl: './dashboard.component.html',
})
export default class DashboardComponent implements OnInit {
  private triviaPartyService = inject(TriviaPartyService);
  private rouletteService = inject(RouletteService);
  private quickThinkingService = inject(QuickThinkingService);
  private gameRoomApiService = inject(GameRoomApiService);
  private router = inject(Router);
  private modalService = inject(ModalService);

  dashboardItems = signal<DashboardItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  openMenuId = signal<string | null>(null);

  showTeamSelection = signal(false);
  showCreateOptions = signal(false);
  selectedItemId = signal<string | null>(null);
  teamCount = signal(2);
  timePerQuestion = signal(30);
  stealPointsEnabled = signal(true); // Toggle para robo de puntos

  // Toast notification
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error'>('success');

  // Share modal
  showShareModal = signal(false);
  shareModalItem = signal<DashboardItem | null>(null);
  generatedShareUrl = signal('');
  shareLoading = signal(false);

  @HostListener('document:click')
  onDocumentClick() {
    this.openMenuId.set(null);
  }

  ngOnInit() {
    this.loadAllTrivias();
  }

  loadAllTrivias() {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      triviaParties: this.triviaPartyService.getTriviaParties(),
      roulettes: this.rouletteService.getRoulettes(),
      quickThinkings: this.quickThinkingService.getQuickThinkings()
    }).subscribe({
      next: ({ triviaParties, roulettes, quickThinkings }) => {
        const items: DashboardItem[] = [
          ...triviaParties.map(tp => ({
            id: tp.id!,
            title: tp.title,
            type: 'triviaparty' as const,
            gameType: tp.type || 'triviaparty',
            isShared: tp.isShared || false,
            createdAt: (tp as any).createdAt,
            updatedAt: (tp as any).updatedAt
          })),
          ...roulettes.map(r => ({
            id: r.id!,
            title: r.title,
            type: 'ruleta' as const,
            isShared: r.isShared || false,
            createdAt: (r as any).createdAt,
            updatedAt: (r as any).updatedAt
          })),
          ...quickThinkings.map(qt => ({
            id: qt.id!,
            title: qt.title,
            type: 'quick-thinking' as const,
            isShared: qt.isShared || false,
            createdAt: (qt as any).createdAt,
            updatedAt: (qt as any).updatedAt
          }))
        ];

        // Sort by creation date (most recent first)
        items.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        this.dashboardItems.set(items);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load trivias. Please try again.');
        console.error(err);
        this.loading.set(false);
      }
    });
  }

  toggleMenu(id: string) {
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  goToLobby() {
    this.router.navigate(['/quick-thinking/lobby']);
  }

  editItem(item: DashboardItem) {
    if (item.type === 'triviaparty') {
      this.router.navigate(['/triviaparty/edit', item.id]);
    } else if (item.type === 'ruleta') {
      this.router.navigate(['/roulette/edit', item.id]);
    } else if (item.type === 'quick-thinking') {
      this.router.navigate(['/quick-thinking/edit', item.id]);
    }
    this.openMenuId.set(null);
  }

  async deleteItem(item: DashboardItem) {
    this.openMenuId.set(null);
    const confirmed = await this.modalService.open({
      title: 'Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar esta trivia? Esta acción no se puede deshacer.'
    });

    if (confirmed) {
      let deleteObservable;
      if (item.type === 'triviaparty') {
        deleteObservable = this.triviaPartyService.deleteTriviaParty(item.id);
      } else if (item.type === 'ruleta') {
        deleteObservable = this.rouletteService.deleteRoulette(item.id);
      } else if (item.type === 'quick-thinking') {
        deleteObservable = this.quickThinkingService.deleteQuickThinking(item.id);
      } else {
        return;
      }

      deleteObservable.subscribe({
        next: () => {
          this.dashboardItems.update(current => current.filter(i => i.id !== item.id));
        },
        error: (err) => {
          this.error.set('Failed to delete trivia. Please try again.');
          console.error(err);
        }
      });
    }
  }

  toggleCreateOptions() {
    this.showCreateOptions.update(current => !current);
  }

  navigateToCreateTriviaParty() {
    this.router.navigateByUrl('/triviaparty/create');
    this.showCreateOptions.set(false);
  }

  isSelectedItemTriviaParty(): boolean {
    const id = this.selectedItemId();
    if (!id) return false;
    const item = this.dashboardItems().find(i => i.id === id);
    return item?.type === 'triviaparty';
  }

  navigateToCreateRoulette() {
    this.router.navigateByUrl('/roulette/create');
    this.showCreateOptions.set(false);
  }

  navigateToCreateQuickThinking() {
    this.router.navigateByUrl('/quick-thinking/create');
    this.showCreateOptions.set(false);
  }

  openTeamSelection(itemId: string) {
    // Find the item to check its type
    const item = this.dashboardItems().find(i => i.id === itemId);

    // If it's quick-thinking, create room immediately and navigate to game-room
    if (item && item.type === 'quick-thinking') {
      this.loading.set(true);

      // Ensure WebSocket is connected before creating room (only if not already connected)
      const token = localStorage.getItem('access_token');
      if (token && !this.quickThinkingService.isConnected()) {
        console.log('🔌 Conectando WebSocket desde dashboard...');
        this.quickThinkingService.connect(token);
      } else if (token) {
        console.log('✅ WebSocket ya conectado');
      }

      this.gameRoomApiService.createRoom(itemId).subscribe({
        next: (room) => {
          console.log('✅ Sala creada:', room);
          this.loading.set(false);
          // Navigate to game room with the room token
          this.router.navigate(['/quick-thinking/game-room', room.roomToken]);
        },
        error: (error) => {
          console.error('❌ Error al crear sala:', error);
          const errorMsg = error.error?.message || 'Error al crear la sala. Inténtalo de nuevo.';
          this.showToastNotification(errorMsg, 'error');
          this.loading.set(false);
        }
      });
      return;
    }

    // For other types, open the team selection modal
    this.selectedItemId.set(itemId);
    this.showTeamSelection.set(true);
  }

  closeTeamSelection() {
    this.showTeamSelection.set(false);
    this.selectedItemId.set(null);
  }

  startGame() {
    if (!this.selectedItemId() || !this.teamCount()) return;

    // Find the selected item to determine its type
    const selectedItem = this.dashboardItems().find(item => item.id === this.selectedItemId());
    if (!selectedItem) return;

    // Navigate to the appropriate game based on item type
    const route = selectedItem.type === 'ruleta' ? '/play-roulette' : '/play';

    const queryParams: any = {
      teams: this.teamCount(),
      time: this.timePerQuestion()
    };

    // Add stealPoints parameter only for TriviaParty
    if (selectedItem.type === 'triviaparty') {
      queryParams.stealPoints = this.stealPointsEnabled();
    }

    this.router.navigate([route, this.selectedItemId()], {
      queryParams
    });
    this.closeTeamSelection();
  }

  toggleShare(item: DashboardItem) {
    const newSharedState = !item.isShared;

    if (item.type === 'triviaparty') {
      this.triviaPartyService.toggleShareTriviaParty(item.id, newSharedState).subscribe({
        next: () => {
          this.dashboardItems.update(current =>
            current.map(i =>
              i.id === item.id ? { ...i, isShared: newSharedState } : i
            )
          );
        },
        error: (err: any) => {
          this.error.set('Failed to update sharing status. Please try again.');
          console.error(err);
        }
      });
    } else if (item.type === 'ruleta') {
      this.rouletteService.toggleShareRoulette(item.id, newSharedState).subscribe({
        next: () => {
          this.dashboardItems.update(current =>
            current.map(i =>
              i.id === item.id ? { ...i, isShared: newSharedState } : i
            )
          );
        },
        error: (err: any) => {
          this.error.set('Failed to update sharing status. Please try again.');
          console.error(err);
        }
      });
    } else if (item.type === 'quick-thinking') {
      this.quickThinkingService.toggleShareQuickThinking(item.id, newSharedState).subscribe({
        next: () => {
          this.dashboardItems.update(current =>
            current.map(i =>
              i.id === item.id ? { ...i, isShared: newSharedState } : i
            )
          );
        },
        error: (err: any) => {
          this.error.set('Failed to update sharing status. Please try again.');
          console.error(err);
        }
      });
    }
    this.openMenuId.set(null);
  }

  getShareUrl(item: DashboardItem): string {
    const baseUrl = window.location.origin;
    let path = 'public/triviaparty';
    if (item.type === 'ruleta') {
      path = 'public/roulette';
    } else if (item.type === 'quick-thinking') {
      path = 'public/quick-thinking';
    }
    // Include hash (#) for hash location routing
    return `${baseUrl}/#/${path}/${item.id}`;
  }

  async copyShareLink(item: DashboardItem) {
    const url = this.getShareUrl(item);
    try {
      await navigator.clipboard.writeText(url);
      this.showToastNotification('¡Enlace copiado al portapapeles!', 'success');
    } catch (err) {
      console.error('Failed to copy:', err);
      this.showToastNotification('No se pudo copiar el enlace', 'error');
    }
    this.openMenuId.set(null);
  }

  showToastNotification(message: string, type: 'success' | 'error' = 'success') {
    this.toastMessage.set(message);
    this.toastType.set(type);
    this.showToast.set(true);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.showToast.set(false);
    }, 3000);
  }

  async shareLink(item: DashboardItem) {
    const url = this.getShareUrl(item);
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: `¡Juega ${item.title} en PonleCoco!`,
          url: url
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback to copy
      this.copyShareLink(item);
    }
    this.openMenuId.set(null);
  }

  openShareModal(item: DashboardItem) {
    this.shareModalItem.set(item);
    this.generatedShareUrl.set('');
    this.showShareModal.set(true);
    this.openMenuId.set(null);
  }

  closeShareModal() {
    this.showShareModal.set(false);
    this.shareModalItem.set(null);
    this.generatedShareUrl.set('');
  }

  generateUniqueLink() {
    const item = this.shareModalItem();
    if (!item) return;

    this.shareLoading.set(true);

    let service;
    if (item.type === 'triviaparty') {
      service = this.triviaPartyService;
    } else if (item.type === 'ruleta') {
      service = this.rouletteService;
    } else if (item.type === 'quick-thinking') {
      service = this.quickThinkingService;
    } else {
      return;
    }

    service.generateShareLink(item.id).subscribe({
      next: (response) => {
        // Map type to route: 'ruleta' -> 'roulette', 'triviaparty' -> 'triviaparty', 'quick-thinking' -> 'quick-thinking'
        let routePath: string = item.type;
        if (item.type === 'ruleta') {
          routePath = 'roulette';
        }
        const baseUrl = `${window.location.origin}/#/public/${routePath}`;
        const shareUrl = `${baseUrl}?code=${response.token}`;
        this.generatedShareUrl.set(shareUrl);
        this.shareLoading.set(false);
        this.showToastNotification('✅ Enlace único generado (válido por 3 días)', 'success');
      },
      error: (err) => {
        console.error('Error generating share link:', err);
        this.shareLoading.set(false);
        this.showToastNotification('❌ Error al generar el enlace', 'error');
      }
    });
  }

  makePublic() {
    const item = this.shareModalItem();
    if (!item) return;

    this.shareLoading.set(true);

    const updateSharedStatus = () => {
      this.shareLoading.set(false);
      const publicUrl = this.getShareUrl(item);
      this.generatedShareUrl.set(publicUrl);

      // Update item in list
      const items = this.dashboardItems();
      const index = items.findIndex(i => i.id === item.id);
      if (index !== -1) {
        items[index].isShared = true;
        this.dashboardItems.set([...items]);
      }
    };

    const handleError = (err: any) => {
      console.error('Error making public:', err);
      this.shareLoading.set(false);
      this.showToastNotification('❌ Error al hacer público el contenido', 'error');
    };

    if (item.type === 'triviaparty') {
      this.triviaPartyService.toggleShareTriviaParty(item.id, true).subscribe({
        next: () => {
          updateSharedStatus();
          this.showToastNotification('✅ Trivia ahora es pública', 'success');
        },
        error: handleError
      });
    } else if (item.type === 'ruleta') {
      this.rouletteService.toggleShareRoulette(item.id, true).subscribe({
        next: () => {
          updateSharedStatus();
          this.showToastNotification('✅ Ruleta ahora es pública', 'success');
        },
        error: handleError
      });
    } else if (item.type === 'quick-thinking') {
      this.quickThinkingService.toggleShareQuickThinking(item.id, true).subscribe({
        next: () => {
          updateSharedStatus();
          this.showToastNotification('✅ Piensa Rápido ahora es público', 'success');
        },
        error: handleError
      });
    }
  }
}
