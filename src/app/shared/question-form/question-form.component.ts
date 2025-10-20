import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ImageCompressionService } from '../image-compression.service';

@Component({
  selector: 'app-question-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div [formGroup]="questionForm" class="p-3 border border-gray-200 rounded bg-white dark:bg-gray-700 dark:border-gray-600">
      <p class="font-semibold dark:text-white mb-3">
        {{ questionTitle }}
      </p>

      <div class="grid grid-cols-1 gap-4">
        <!-- Question -->
        <div>
          <label
            [for]="'q-' + questionId"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Pregunta
          </label>
          <textarea
            [id]="'q-' + questionId"
            formControlName="question"
            [rows]="questionRows"
            class="mt-1 block w-full px-3 py-3 sm:py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
            [placeholder]="questionPlaceholder"
          ></textarea>
          @if(questionForm.get('question')?.invalid && questionForm.get('question')?.touched) {
          <div class="text-red-600 text-sm mt-1 dark:text-red-400">
            La pregunta es requerida.
          </div>
          }
        </div>

        <!-- Answer -->
        <div>
          <label
            [for]="'a-' + questionId"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Respuesta
          </label>
          <textarea
            [id]="'a-' + questionId"
            formControlName="answer"
            [rows]="answerRows"
            class="mt-1 block w-full px-3 py-3 sm:py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
            [placeholder]="answerPlaceholder"
          ></textarea>
          @if(questionForm.get('answer')?.invalid && questionForm.get('answer')?.touched) {
          <div class="text-red-600 text-sm mt-1 dark:text-red-400">
            La respuesta es requerida.
          </div>
          }
        </div>
      </div>

      <!-- Image Upload Section -->
      <div class="mt-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Imagen (Opcional)
        </label>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Formatos soportados: JPG, PNG, GIF, etc.
        </p>
        <div class="flex flex-col gap-3">
          <input
            type="file"
            [id]="'img-' + questionId"
            (change)="onFileSelected($event)"
            class="hidden"
            accept="image/*"
            #fileInput
          />

          @if (!previewUrl && !questionForm.get('imageUrl')?.value && !isCompressing) {
          <button
            type="button"
            (click)="fileInput.click()"
            class="w-full sm:w-auto cursor-pointer px-4 py-3 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 touch-manipulation min-h-[44px] flex items-center justify-center"
          >
            <span>📷 Seleccionar Imagen</span>
          </button>
          }

          @if (isCompressing) {
          <div class="flex items-center gap-2 px-3 py-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-900/20 dark:border-blue-600">
            <svg class="animate-spin h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-sm text-blue-700 dark:text-blue-300">Comprimiendo imagen...</span>
          </div>
          }

          @if (previewUrl || questionForm.get('imageUrl')?.value) {
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <img
              [src]="previewUrl || questionForm.get('imageUrl')?.value"
              alt="Preview"
              class="h-20 w-20 sm:h-16 sm:w-16 object-cover rounded"
            />
            <button
              type="button"
              (click)="removeImage()"
              class="w-full sm:w-auto px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 touch-manipulation min-h-[44px]"
            >
              🗑️ Quitar Imagen
            </button>
          </div>
          }
        </div>
      </div>
    </div>
  `,
})
export default class QuestionFormComponent {
  private imageCompressionService = inject(ImageCompressionService);

  @Input() questionForm!: FormGroup;
  @Input() questionId!: string;
  @Input() questionTitle!: string;
  @Input() previewUrl?: string | null;
  @Input() isCompressing: boolean = false;
  @Input() questionRows: number = 3;
  @Input() answerRows: number = 3;
  @Input() questionPlaceholder: string = 'Escribe la pregunta aquí...';
  @Input() answerPlaceholder: string = 'Escribe la respuesta aquí...';

  @Output() fileSelected = new EventEmitter<File>();
  @Output() imageRemoved = new EventEmitter<void>();

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.fileSelected.emit(file);
    }
  }

  removeImage() {
    this.imageRemoved.emit();
  }
}
