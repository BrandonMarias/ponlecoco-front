import { Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (compact()) {
      <button
        type="button"
        (click)="navigateBack()"
        [attr.aria-label]="label()"
        class="inline-flex items-center justify-center w-10 h-10 shrink-0 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
      </button>
    } @else {
      <div class="my-4">
        <button
          type="button"
          (click)="navigateBack()"
          class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          {{ label() }}
        </button>
      </div>
    }
  `
})
export class BackButtonComponent {
  private router = inject(Router);

  // Inputs
  label = input<string>('Volver');
  route = input<string>('/dashboard');
  /** Icon-only round button (for dense toolbars). */
  compact = input(false);
  /** When true the button only emits `pressed`, so the parent decides (e.g. confirm unsaved changes). */
  intercept = input(false);

  pressed = output<void>();

  navigateBack() {
    if (this.intercept()) {
      this.pressed.emit();
      return;
    }
    this.router.navigateByUrl(this.route());
  }
}
