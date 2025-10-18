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
            gameType: tp.type || 'triviaparty'
          })),
          ...roulettes.map(r => ({
            id: r.id!,
            title: r.title,
            type: 'ruleta' as const
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
    this.router.navigate(['/play', this.selectedItemId()], {
      queryParams: {
        teams: this.teamCount(),
        time: this.timePerQuestion()
      }
    });
    this.closeTeamSelection();
  }
}
