import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../shared/header/header.component';
import { TriviaPartyService } from '../triviaparty/triviaparty.service';
import { RouletteService } from '../roulette/roulette.service';
import { QuickThinkingService } from '../quick-thinking/quick-thinking.service';
import { GameRoomApiService } from '../quick-thinking/game-room-api.service';
import { ModalService } from '../shared/modal.service';
import { Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ShareModalComponent } from '../shared/share-modal/share-modal.component';

type ItemType = 'triviaparty' | 'ruleta' | 'quick-thinking';

// Unified interface for dashboard items
interface DashboardItem {
  id: string;
  title: string;
  type: ItemType;
  gameType?: ItemType; // For TriviaParty items that can be either type
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

  // One signal per source so each list renders as soon as it (or its cached copy) arrives
  private triviaItems = signal<DashboardItem[]>([]);
  private rouletteItems = signal<DashboardItem[]>([]);
  private quickThinkingItems = signal<DashboardItem[]>([]);
  private pendingSources = signal(3);

  dashboardItems = computed<DashboardItem[]>(() => {
    const items = [...this.triviaItems(), ...this.rouletteItems(), ...this.quickThinkingItems()];
    // Sort by creation date (most recent first)
    items.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return items;
  });
  /** True until every list has emitted at least once (cache or network). */
  loading = computed(() => this.pendingSources() > 0);
  error = signal<string | null>(null);
  openMenuId = signal<string | null>(null);
  /** Item ids with a mutation in flight (prevents double taps). */
  busyIds = signal<ReadonlySet<string>>(new Set());
  /** Quick-thinking item whose room is being created. */
  startingId = signal<string | null>(null);

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
    this.error.set(null);
    this.pendingSources.set(3);

    // The three requests are independent and run in parallel; each one first emits its cached copy.
    this.loadSource(
      this.triviaPartyService.getTriviaParties(),
      this.triviaItems,
      (tp: any) => ({ type: 'triviaparty', gameType: tp.type || 'triviaparty' })
    );
    this.loadSource(this.rouletteService.getRoulettes(), this.rouletteItems, () => ({ type: 'ruleta' }));
    this.loadSource(
      this.quickThinkingService.getQuickThinkings(),
      this.quickThinkingItems,
      () => ({ type: 'quick-thinking' })
    );
  }

  private loadSource(
    source$: Observable<any[]>,
    target: { set(items: DashboardItem[]): void },
    meta: (raw: any) => Pick<DashboardItem, 'type' | 'gameType'>
  ) {
    let emitted = false;
    const markLoaded = () => {
      if (!emitted) {
        emitted = true;
        this.pendingSources.update(n => n - 1);
      }
    };
    source$.subscribe({
      next: (list) => {
        target.set(
          list.map(raw => ({
            id: raw.id!,
            title: raw.title,
            ...meta(raw),
            isShared: raw.isShared || false,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
          }))
        );
        markLoaded();
      },
      error: (err) => {
        this.error.set('Failed to load trivias. Please try again.');
        console.error(err);
        markLoaded();
      },
    });
  }

  private sourceFor(type: ItemType) {
    if (type === 'triviaparty') return this.triviaItems;
    if (type === 'ruleta') return this.rouletteItems;
    return this.quickThinkingItems;
  }

  private setBusy(id: string, busy: boolean) {
    this.busyIds.update(current => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
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
    if (this.busyIds().has(item.id)) return;

    const confirmed = await this.modalService.open({
      title: 'Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar esta trivia? Esta acción no se puede deshacer.'
    });
    if (!confirmed) return;

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

    // Optimistic: remove right away, put it back if the server refuses
    const source = this.sourceFor(item.type);
    const previous = source();
    source.set(previous.filter(i => i.id !== item.id));
    this.setBusy(item.id, true);

    deleteObservable.subscribe({
      next: () => this.setBusy(item.id, false),
      error: (err) => {
        console.error(err);
        this.setBusy(item.id, false);
        source.update(current => (current.some(i => i.id === item.id) ? current : [...current, item]));
        this.showToastNotification('No se pudo eliminar. Inténtalo de nuevo.', 'error');
      }
    });
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
      if (this.startingId()) return;
      this.startingId.set(itemId);

      // Ensure WebSocket is connected before creating room (only if not already connected)
      const token = localStorage.getItem('access_token');
      if (token && !this.quickThinkingService.isConnected()) {
        this.quickThinkingService.connect(token);
      }

      this.gameRoomApiService.createRoom(itemId).subscribe({
        next: (room) => {
          this.startingId.set(null);
          // Navigate to game room with the room token
          this.router.navigate(['/quick-thinking/game-room', room.roomToken]);
        },
        error: (error) => {
          console.error('❌ Error al crear sala:', error);
          const errorMsg = error.error?.message || 'Error al crear la sala. Inténtalo de nuevo.';
          this.showToastNotification(errorMsg, 'error');
          this.startingId.set(null);
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

  private setSharedRequest(item: DashboardItem, isShared: boolean): Observable<unknown> {
    if (item.type === 'triviaparty') return this.triviaPartyService.toggleShareTriviaParty(item.id, isShared);
    if (item.type === 'ruleta') return this.rouletteService.toggleShareRoulette(item.id, isShared);
    return this.quickThinkingService.toggleShareQuickThinking(item.id, isShared);
  }

  private setSharedLocally(item: DashboardItem, isShared: boolean) {
    this.sourceFor(item.type).update(current =>
      current.map(i => (i.id === item.id ? { ...i, isShared } : i))
    );
  }

  /** Optimistic share toggle; `onDone` runs after the server confirms. */
  private updateShared(item: DashboardItem, isShared: boolean, onDone?: () => void, onFail?: () => void) {
    if (this.busyIds().has(item.id)) return;
    const previous = !!item.isShared;
    this.setSharedLocally(item, isShared);
    this.setBusy(item.id, true);

    this.setSharedRequest(item, isShared).subscribe({
      next: () => {
        this.setBusy(item.id, false);
        onDone?.();
      },
      error: (err: any) => {
        console.error(err);
        this.setBusy(item.id, false);
        this.setSharedLocally(item, previous);
        this.showToastNotification('❌ No se pudo actualizar el estado público', 'error');
        onFail?.();
      }
    });
  }

  toggleShare(item: DashboardItem) {
    this.openMenuId.set(null);
    this.updateShared(item, !item.isShared);
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
    if (!item || this.shareLoading()) return;

    this.shareLoading.set(true);

    let service;
    if (item.type === 'triviaparty') {
      service = this.triviaPartyService;
    } else if (item.type === 'ruleta') {
      service = this.rouletteService;
    } else if (item.type === 'quick-thinking') {
      service = this.quickThinkingService;
    } else {
      this.shareLoading.set(false);
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
    if (!item || this.shareLoading() || this.busyIds().has(item.id)) return;

    const successMessage =
      item.type === 'triviaparty'
        ? '✅ Trivia ahora es pública'
        : item.type === 'ruleta'
          ? '✅ Ruleta ahora es pública'
          : '✅ Piensa Rápido ahora es público';

    // Optimistic: the link is shown at once; the list flips to "Pública" and rolls back on error
    this.generatedShareUrl.set(this.getShareUrl(item));
    this.shareLoading.set(true);
    this.updateShared(
      item,
      true,
      () => {
        this.shareLoading.set(false);
        this.showToastNotification(successMessage, 'success');
      },
      () => {
        this.shareLoading.set(false);
        this.generatedShareUrl.set('');
      }
    );
  }
}
