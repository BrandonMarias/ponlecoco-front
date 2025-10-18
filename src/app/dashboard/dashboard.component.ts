import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../shared/header/header.component';
import { TriviaPartyService } from '../triviaparty/triviaparty.service';
import { TriviaParty } from '../triviaparty/triviaparty';
import { ModalService } from '../shared/modal.service';
import { filter } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HeaderComponent, FormsModule],
  templateUrl: './dashboard.component.html',
})
export default class DashboardComponent implements OnInit {
  private triviaPartyService = inject(TriviaPartyService);
  private router = inject(Router);
  private modalService = inject(ModalService);

  triviaParties = signal<TriviaParty[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  openMenuId = signal<string | null>(null);

  showTeamSelection = signal(false);
  selectedTriviaPartyId = signal<string | null>(null);
  teamCount = signal(2);
  timePerQuestion = signal(30);

  @HostListener('document:click')
  onDocumentClick() {
    this.openMenuId.set(null);
  }

  ngOnInit() {
    this.loadTriviaParties();
  }

  loadTriviaParties() {
    this.loading.set(true);
    this.error.set(null);
    this.triviaPartyService.getTriviaParties().subscribe({
      next: (data) => {
        this.triviaParties.set(data);
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

  editTriviaParty(id: string) {
    this.router.navigate(['/triviaparty/edit', id]);
    this.openMenuId.set(null);
  }

  async deleteTriviaParty(id: string) {
    this.openMenuId.set(null);
    const confirmed = await this.modalService.open({
      title: 'Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar esta trivia? Esta acción no se puede deshacer.'
    });

    if (confirmed) {
      this.triviaPartyService.deleteTriviaParty(id).subscribe({
        next: () => {
          this.triviaParties.update(current => current.filter(j => j.id !== id));
        },
        error: (err) => {
          this.error.set('Failed to delete trivia. Please try again.');
          console.error(err);
        }
      });
    }
  }

  navigateToCreateTriviaParty() {
    this.router.navigateByUrl('/triviaparty/create');
  }

  openTeamSelection(triviaPartyId: string) {
    this.selectedTriviaPartyId.set(triviaPartyId);
    this.showTeamSelection.set(true);
  }

  closeTeamSelection() {
    this.showTeamSelection.set(false);
    this.selectedTriviaPartyId.set(null);
  }

  startGame() {
    if (!this.selectedTriviaPartyId() || !this.teamCount()) return;
    this.router.navigate(['/play', this.selectedTriviaPartyId()], {
      queryParams: {
        teams: this.teamCount(),
        time: this.timePerQuestion()
      }
    });
    this.closeTeamSelection();
  }
}
