import { Component, effect, inject } from '@angular/core';
import { ModalService } from '../modal.service';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-input-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (modalService.isInputOpen()) {
      <div class="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm z-40 flex items-center justify-center p-4" (click)="onCancel()">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md z-50" (click)="$event.stopPropagation()">
          @if (modalService.inputModalData(); as data) {
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">{{ data.title }}</h3>
            <p class="text-gray-600 dark:text-gray-300 mb-6">{{ data.message }}</p>
            <input type="text" [(ngModel)]="inputValue" class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
          }
          <div class="flex justify-end space-x-4 mt-6">
            <button (click)="onCancel()" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
              Cancelar
            </button>
            <button (click)="onConfirm()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Confirmar
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class InputModalComponent {
  modalService = inject(ModalService);
  inputValue = '';

  constructor() {
    effect(() => {
      if (this.modalService.isInputOpen()) {
        this.inputValue = '';
      }
    });
  }

  onConfirm() {
    this.modalService.confirmInput(this.inputValue);
  }

  onCancel() {
    this.modalService.closeInput();
  }
}
