import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../shared/header/header.component';
import { JeopardyService } from '../jeopardy/jeopardy.service';
import { Jeopardy } from '../jeopardy/jeopardy';
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
  private jeopardyService = inject(JeopardyService);
  private router = inject(Router);
  private modalService = inject(ModalService);

  jeopardies = signal<Jeopardy[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  openMenuId = signal<string | null>(null);

  showTeamSelection = signal(false);
  selectedJeopardyId = signal<string | null>(null);
  teamCount = signal(2);
  timePerQuestion = signal(30);

  @HostListener('document:click')
  onDocumentClick() {
    this.openMenuId.set(null);
  }

  ngOnInit() {
    this.loadJeopardies();
  }

  loadJeopardies() {
    this.loading.set(true);
    this.error.set(null);
    this.jeopardyService.getJeopardies().subscribe({
      next: (data) => {
        this.jeopardies.set(data);
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

  editJeopardy(id: string) {
    this.router.navigate(['/jeopardy/edit', id]);
    this.openMenuId.set(null);
  }

  deleteJeopardy(id: string) {
    this.openMenuId.set(null);
    this.modalService.open({
      title: 'Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar esta trivia? Esta acción no se puede deshacer.'
    }).pipe(
      filter(confirmed => confirmed)
    ).subscribe(() => {
      this.jeopardyService.deleteJeopardy(id).subscribe({
        next: () => {
          this.jeopardies.update(current => current.filter(j => j.id !== id));
        },
        error: (err) => {
          this.error.set('Failed to delete trivia. Please try again.');
          console.error(err);
        }
      });
    });
  }

  navigateTocreateJeopardy() {
    this.router.navigateByUrl('/jeopardy/create');
  }

  openTeamSelection(jeopardyId: string) {
    this.selectedJeopardyId.set(jeopardyId);
    this.showTeamSelection.set(true);
  }

  closeTeamSelection() {
    this.showTeamSelection.set(false);
    this.selectedJeopardyId.set(null);
  }

  startGame() {
    if (!this.selectedJeopardyId() || !this.teamCount()) return;
    this.router.navigate(['/play', this.selectedJeopardyId()], {
      queryParams: {
        teams: this.teamCount(),
        time: this.timePerQuestion()
      }
    });
    this.closeTeamSelection();
  }
}
