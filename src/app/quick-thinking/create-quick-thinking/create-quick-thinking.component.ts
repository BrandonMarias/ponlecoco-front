import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuickThinkingService } from '../quick-thinking.service';
import { finalize, switchMap, of, forkJoin } from 'rxjs';
import { QuickThinking } from '../quick-thinking';
import { ModalService } from '../../shared/modal.service';
import { ImageCompressionService } from '../../shared/image-compression.service';
import { ImageUploadComponent } from '../../shared/image-upload/image-upload.component';
import { BackButtonComponent } from '../../shared/back-button/back-button.component';

@Component({
  selector: 'app-create-quick-thinking',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ImageUploadComponent, BackButtonComponent],
  templateUrl: './create-quick-thinking.component.html',
})
export default class CreateQuickThinkingComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private quickThinkingService = inject(QuickThinkingService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private modalService = inject(ModalService);
  private imageCompressionService = inject(ImageCompressionService);

  quickThinkingForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  compressingImages = signal<Set<number>>(new Set());
  isEditMode = signal(false);
  private quickThinkingId: string | null = null;
  private previewUrls = new Map<number, string>();

  // Constants
  readonly MAX_QUESTIONS = 30;

  // Toast notification
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error' | 'warning'>('success');

  constructor() {
    this.quickThinkingForm = this.fb.group({
      title: ['', Validators.required],
      questions: this.fb.array(
        [this.createQuestionGroup()],
        [Validators.required, Validators.minLength(1)]
      ),
    });
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.quickThinkingId = params.get('id');
          if (this.quickThinkingId) {
            this.isEditMode.set(true);
            this.loading.set(true);
            return this.quickThinkingService.getQuickThinkingById(this.quickThinkingId);
          }
          return of(null);
        })
      )
      .subscribe({
        next: (quickThinking) => {
          if (quickThinking) {
            this.patchForm(quickThinking);
            this.loading.set(false);
          }
        },
        error: (err) => {
          this.error.set('Error al cargar la trivia.');
          this.loading.set(false);
          console.error(err);
        },
      });
  }

  ngOnDestroy(): void {
    this.previewUrls.forEach(url => URL.revokeObjectURL(url));
  }

  createQuestionGroup(): FormGroup {
    return this.fb.group({
      question: ['', Validators.required],
      options: this.fb.array([
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required),
      ]),
      correctAnswerIndex: [0, [Validators.required, Validators.min(0), Validators.max(3)]],
      imageUrl: [null],
      imageFile: [null],
    });
  }

  patchForm(quickThinking: QuickThinking) {
    this.quickThinkingForm.patchValue({
      title: quickThinking.title,
    });

    // Clear existing questions
    while (this.questions.length !== 0) {
      this.questions.removeAt(0);
    }

    // Add questions from quick thinking
    quickThinking.questions.forEach((q) => {
      const questionGroup = this.fb.group({
        question: [q.question, Validators.required],
        options: this.fb.array(
          q.options.map(opt => this.fb.control(opt, Validators.required))
        ),
        correctAnswerIndex: [q.correctAnswerIndex, [Validators.required, Validators.min(0), Validators.max(3)]],
        imageUrl: [q.imageUrl || null],
        imageFile: [null],
      });
      this.questions.push(questionGroup);
    });
  }

  get questions() {
    return this.quickThinkingForm.get('questions') as FormArray;
  }

  getOptions(questionIndex: number): FormArray {
    return this.questions.at(questionIndex).get('options') as FormArray;
  }

  addQuestion() {
    if (this.questions.length >= this.MAX_QUESTIONS) {
      this.showToastNotification(`No se pueden agregar más de ${this.MAX_QUESTIONS} preguntas`, 'warning');
      return;
    }
    this.questions.push(this.createQuestionGroup());
  }

  async removeQuestion(index: number) {
    if (this.questions.length <= 1) {
      this.showToastNotification('Debe haber al menos una pregunta', 'warning');
      return;
    }

    const confirmed = await this.modalService.open({
      title: 'Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar esta pregunta?'
    });

    if (confirmed) {
      // Clean up preview URL if exists
      const previewUrl = this.previewUrls.get(index);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        this.previewUrls.delete(index);
      }

      this.questions.removeAt(index);
    }
  }

  async onImageSelected(file: File, questionIndex: number) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.showToastNotification('Por favor selecciona un archivo de imagen válido', 'error');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.showToastNotification('La imagen no debe superar los 10MB', 'error');
      return;
    }

    const questionGroup = this.questions.at(questionIndex);

    // Clean up previous preview URL
    const oldPreviewUrl = this.previewUrls.get(questionIndex);
    if (oldPreviewUrl) {
      URL.revokeObjectURL(oldPreviewUrl);
    }

    // Compress image
    this.compressingImages.update(set => new Set(set).add(questionIndex));

    try {
      const result = await this.imageCompressionService.compressImage(file);

      // Remove from compressing set
      this.compressingImages.update(set => {
        const newSet = new Set(set);
        newSet.delete(questionIndex);
        return newSet;
      });

      // Final validation after compression
      const validation = this.imageCompressionService.validateImageFile(result.file);
      if (!validation.isValid) {
        this.error.set(validation.errorMessage!);
        this.showToastNotification(validation.errorMessage!, 'error');
        return;
      }

      // Create preview URL with the compressed file
      const previewUrl = URL.createObjectURL(result.file);
      this.previewUrls.set(questionIndex, previewUrl);

      // Store the compressed file (not the result object)
      questionGroup.patchValue({
        imageFile: result.file,
        imageUrl: null // Clear existing URL when a new file is selected
      });
    } catch (error) {
      console.error('Error compressing image:', error);

      // Remove from compressing set on error
      this.compressingImages.update(set => {
        const newSet = new Set(set);
        newSet.delete(questionIndex);
        return newSet;
      });

      this.error.set('Error al comprimir la imagen. Por favor, inténtalo de nuevo.');
      this.showToastNotification('No se pudo comprimir la imagen', 'error');
    }
  }

  removeImage(questionIndex: number) {
    const questionGroup = this.questions.at(questionIndex);
    questionGroup.patchValue({
      imageUrl: null,
      imageFile: null
    });

    // Clean up preview URL
    const previewUrl = this.previewUrls.get(questionIndex);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      this.previewUrls.delete(questionIndex);
    }
  }

  getImagePreview(questionIndex: number): string | null {
    const questionGroup = this.questions.at(questionIndex);
    const previewUrl = this.previewUrls.get(questionIndex);
    const existingImageUrl = questionGroup.get('imageUrl')?.value;

    return previewUrl || existingImageUrl || null;
  }

  hasImageFile(questionIndex: number): boolean {
    const questionGroup = this.questions.at(questionIndex);
    return !!questionGroup.get('imageFile')?.value;
  }

  async onSubmit() {
    if (this.quickThinkingForm.invalid) {
      this.quickThinkingForm.markAllAsTouched();
      this.showToastNotification('Por favor completa todos los campos requeridos', 'error');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      // Upload all images first
      const imageUploadObservables = this.questions.controls.map((questionGroup, index) => {
        const imageFile = questionGroup.get('imageFile')?.value;
        if (imageFile) {
          return this.quickThinkingService.uploadQuestionImage(imageFile);
        }
        return of({ imageUrl: questionGroup.get('imageUrl')?.value || null });
      });

      const imageResults = await forkJoin(imageUploadObservables).toPromise();

      // Build the payload
      const formValue = this.quickThinkingForm.value;
      const payload: Omit<QuickThinking, 'id' | 'userId'> = {
        title: formValue.title,
        questions: formValue.questions.map((q: any, index: number) => ({
          question: q.question,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          imageUrl: imageResults?.[index]?.imageUrl || null,
        })),
      };

      // Create or update
      const saveObservable = this.isEditMode() && this.quickThinkingId
        ? this.quickThinkingService.updateQuickThinking(this.quickThinkingId, payload)
        : this.quickThinkingService.createQuickThinking(payload);

      saveObservable.pipe(
        finalize(() => this.loading.set(false))
      ).subscribe({
        next: () => {
          this.showToastNotification(
            this.isEditMode() ? '✅ Trivia actualizada exitosamente' : '✅ Trivia creada exitosamente',
            'success'
          );
          setTimeout(() => {
            this.router.navigateByUrl('/dashboard');
          }, 1500);
        },
        error: (err) => {
          console.error('Error saving quick thinking:', err);
          this.error.set('Error al guardar la trivia. Por favor, inténtalo de nuevo.');
          this.showToastNotification('❌ Error al guardar la trivia', 'error');
        }
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      this.loading.set(false);
      this.error.set('Error al subir las imágenes. Por favor, inténtalo de nuevo.');
      this.showToastNotification('❌ Error al subir las imágenes', 'error');
    }
  }

  async cancel() {
    const hasChanges = this.quickThinkingForm.dirty;

    if (hasChanges) {
      const confirmed = await this.modalService.open({
        title: 'Descartar Cambios',
        message: '¿Estás seguro de que quieres salir? Los cambios no guardados se perderán.'
      });

      if (!confirmed) {
        return;
      }
    }

    this.router.navigateByUrl('/dashboard');
  }

  async generateQuestionsWithAI() {
    // Prompt for topic or text
    const input = await this.modalService.openInput({
      title: 'Generar Preguntas con IA',
      message: 'Ingresa un tema o pega un texto para generar 20 preguntas automáticamente:'
    });

    if (!input || input.trim() === '') {
      return;
    }

    // Confirm action
    const confirmed = await this.modalService.open({
      title: 'Confirmar Generación',
      message: '¿Deseas generar 20 preguntas automáticamente? Esto reemplazará las preguntas actuales.'
    });

    if (!confirmed) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // Determine if input is a topic (short) or text (long)
    const params = input.trim().length > 100
      ? { text: input.trim() }
      : { topic: input.trim() };

    this.quickThinkingService.generateQuickThinkingWithAI(params).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (response) => {
        // Set title if provided
        if (response.title) {
          this.quickThinkingForm.patchValue({ title: response.title });
        }

        // Clear existing questions
        while (this.questions.length !== 0) {
          this.questions.removeAt(0);
        }

        // Add generated questions
        response.questions.forEach((q: any) => {
          const questionGroup = this.fb.group({
            question: [q.question, Validators.required],
            options: this.fb.array(
              q.options.map((opt: string) => this.fb.control(opt, Validators.required))
            ),
            correctAnswerIndex: [q.correctAnswerIndex, [Validators.required, Validators.min(0), Validators.max(3)]],
            imageUrl: [null],
            imageFile: [null],
          });
          this.questions.push(questionGroup);
        });

        this.showToastNotification('✅ Preguntas generadas exitosamente', 'success');
      },
      error: (err) => {
        console.error('Error generating questions:', err);
        this.error.set('Error al generar las preguntas. Por favor, inténtalo de nuevo.');
        this.showToastNotification('❌ Error al generar preguntas con IA', 'error');
      }
    });
  }

  showToastNotification(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    this.toastMessage.set(message);
    this.toastType.set(type);
    this.showToast.set(true);

    setTimeout(() => {
      this.showToast.set(false);
    }, 3000);
  }
}
