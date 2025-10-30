import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../shared/header/header.component';
import { TriviaPartyService } from '../triviaparty/triviaparty.service';
import { TriviaParty } from '../triviaparty/triviaparty';
import { RouletteService } from '../roulette/roulette.service';
import { Roulette } from '../roulette/roulette';
import { ModalService } from '../shared/modal.service';
import { forkJoin } from 'rxjs';
import { FormsModule } from '@angular/forms';

// Unified interface for dashboard items
interface DashboardItem {
  id: string;
  title: string;
  type: 'triviaparty' | 'ruleta';
  gameType?: 'triviaparty' | 'ruleta'; // For TriviaParty items that can be either type
  isShared?: boolean; // Track if item is publicly shared
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HeaderComponent, FormsModule],
  templateUrl: './dashboard.component.html',
})
export default class DashboardComponent implements OnInit {
  private triviaPartyService = inject(TriviaPartyService);
  private rouletteService = inject(RouletteService);
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

  // Toast notification
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error'>('success');

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
      roulettes: this.rouletteService.getRoulettes()
    }).subscribe({
      next: ({ triviaParties, roulettes }) => {
        const items: DashboardItem[] = [
          ...triviaParties.map(tp => ({
            id: tp.id!,
            title: tp.title,
            type: 'triviaparty' as const,
            gameType: tp.type || 'triviaparty',
            isShared: tp.isShared || false
          })),
          ...roulettes.map(r => ({
            id: r.id!,
            title: r.title,
            type: 'ruleta' as const,
            isShared: r.isShared || false
          }))
        ];
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

  editItem(item: DashboardItem) {
    if (item.type === 'triviaparty') {
      this.router.navigate(['/triviaparty/edit', item.id]);
    } else {
      this.router.navigate(['/roulette/edit', item.id]);
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
      const deleteObservable = item.type === 'triviaparty'
        ? this.triviaPartyService.deleteTriviaParty(item.id)
        : this.rouletteService.deleteRoulette(item.id);

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

  navigateToCreateRoulette() {
    this.router.navigateByUrl('/roulette/create');
    this.showCreateOptions.set(false);
  }

  openTeamSelection(itemId: string) {
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

    this.router.navigate([route, this.selectedItemId()], {
      queryParams: {
        teams: this.teamCount(),
        time: this.timePerQuestion()
      }
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
    } else {
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
    }
    this.openMenuId.set(null);
  }

  getShareUrl(item: DashboardItem): string {
    const baseUrl = window.location.origin;
    const path = item.type === 'triviaparty' ? 'public/triviaparty' : 'public/roulette';
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
}
