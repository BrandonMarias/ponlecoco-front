import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (variant() === 'tile') {
      <input
        type="file"
        accept="image/*"
        (change)="onFileSelected($event)"
        [id]="inputId()"
        class="hidden"
        #tileInput
      />
      <div class="relative w-20 h-20 shrink-0">
        <button
          type="button"
          (click)="tileInput.click()"
          [disabled]="isCompressing()"
          [attr.aria-label]="previewUrl() ? 'Cambiar imagen' : 'Agregar imagen'"
          class="w-full h-full overflow-hidden rounded-xl flex items-center justify-center touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          [class]="previewUrl()
            ? 'border border-gray-300 dark:border-gray-600'
            : 'border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-indigo-400 hover:text-indigo-500'"
        >
          @if (isCompressing()) {
            <svg class="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          } @else if (previewUrl()) {
            <img [src]="previewUrl()" alt="Imagen de la pregunta" class="w-full h-full object-cover" />
          } @else {
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          }
        </button>
        @if (previewUrl() && !isCompressing()) {
          <button
            type="button"
            (click)="onRemoveImage()"
            aria-label="Quitar imagen"
            class="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 before:absolute before:-inset-2 before:content-['']"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        }
      </div>
    } @else {
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {{ label() }}
      </label>

      @if (helperText()) {
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {{ helperText() }}
        </p>
      }

      @if (previewUrl()) {
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div class="relative">
            <img
              [src]="previewUrl()"
              alt="Preview"
              class="h-20 w-20 sm:h-16 sm:w-16 object-cover rounded"
            />
            @if (!isCompressing()) {
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
        <div class="flex flex-col gap-3">
          @if (isCompressing()) {
            <div class="flex items-center gap-2 px-3 py-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-900/20 dark:border-blue-600">
              <svg class="animate-spin h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-sm text-blue-700 dark:text-blue-300">Comprimiendo imagen...</span>
            </div>
          } @else {
            <input
              type="file"
              accept="image/*"
              (change)="onFileSelected($event)"
              [id]="inputId()"
              class="hidden"
              #fileInput
            />
            <button
              type="button"
              (click)="fileInput.click()"
              class="w-full sm:w-auto cursor-pointer px-4 py-3 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 touch-manipulation min-h-[44px] flex items-center justify-center"
            >
              <span>📷 Seleccionar Imagen</span>
            </button>
          }
        </div>
      }
    </div>
    }
  `,
})
export class ImageUploadComponent {
  /** `tile` = compact square (tap to add/replace, x to remove) used by the quiz editors. */
  variant = input<'default' | 'tile'>('default');

  label = input<string>('Imagen (Opcional)');
  helperText = input<string | undefined>(undefined);
  previewUrl = input<string | null | undefined>(undefined);
  isCompressing = input<boolean>(false);
  inputId = input<string>('image-upload');

  fileSelected = output<File>();
  imageRemoved = output<void>();

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
