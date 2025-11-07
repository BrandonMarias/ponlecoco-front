import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {{ label }}
      </label>

      @if (helperText) {
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {{ helperText }}
        </p>
      }

      @if (previewUrl) {
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div class="relative">
            <img
              [src]="previewUrl"
              alt="Preview"
              class="h-20 w-20 sm:h-16 sm:w-16 object-cover rounded-md border border-gray-300 dark:border-gray-600"
            />
            @if (!isCompressing) {
              <button
                type="button"
                (click)="onRemoveImage()"
                class="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg transition-colors"
                title="Eliminar imagen"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            }
          </div>
        </div>
      } @else {
        <div class="flex flex-col gap-2">
          @if (isCompressing) {
            <div class="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-900/20 dark:border-blue-600">
              <svg class="animate-spin h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-sm font-medium text-blue-700 dark:text-blue-300">Comprimiendo imagen...</span>
            </div>
          } @else {
            <input
              type="file"
              accept="image/*"
              (change)="onFileSelected($event)"
              [id]="inputId"
              class="hidden"
              #fileInput
            />
            <button
              type="button"
              (click)="fileInput.click()"
              class="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors text-sm font-medium touch-manipulation min-h-[44px]"
            >
              <span>📷 Seleccionar Imagen</span>
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class ImageUploadComponent {
  @Input() label: string = 'Imagen (Opcional)';
  @Input() helperText?: string;
  @Input() previewUrl?: string | null;
  @Input() isCompressing: boolean = false;
  @Input() inputId: string = 'image-upload';

  @Output() fileSelected = new EventEmitter<File>();
  @Output() imageRemoved = new EventEmitter<void>();

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.fileSelected.emit(file);
      // Clear the input so the same file can be selected again if needed
      input.value = '';
    }
  }

  onRemoveImage() {
    this.imageRemoved.emit();
  }
}
