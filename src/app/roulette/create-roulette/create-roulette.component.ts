import { Component, inject, signal, computed, viewChild, OnInit, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RouletteService } from '../roulette.service';
import { finalize, switchMap, of, Observable, forkJoin, map, tap } from 'rxjs';
import { Roulette } from '../roulette';
import { ModalService } from '../../shared/modal.service';
import { ImageCompressionService } from '../../shared/image-compression.service';
import { ImageUploadComponent } from '../../shared/image-upload/image-upload.component';
import { AiUsageService } from '../../shared/ai-usage.service';
import { QuizEditorShellComponent } from '../../shared/quiz-editor/quiz-editor-shell.component';
import { QuizNavigatorComponent } from '../../shared/quiz-editor/quiz-navigator.component';
import { QuizQuestionToolbarComponent } from '../../shared/quiz-editor/quiz-question-toolbar.component';
import { QuizReviewOverlayComponent } from '../../shared/quiz-editor/quiz-review-overlay.component';
import { QuizToastComponent } from '../../shared/quiz-editor/quiz-toast.component';
import { QuizEditorState } from '../../shared/quiz-editor/quiz-editor-state';
import {
  NavItem,
  ReviewCard,
  firstIncompleteIndex,
  incompleteCount,
  missingFields,
  questionStatus,
  truncate,
} from '../../shared/quiz-editor/quiz-editor.utils';

/** Badge colour per point value (same palette the old screen used for the value headers). */
const VALUE_COLORS: Record<number, string> = {
  100: 'bg-green-600',
  200: 'bg-blue-600',
  300: 'bg-purple-600',
  400: 'bg-orange-600',
  500: 'bg-red-600',
};

@Component({
  selector: 'app-create-roulette',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ImageUploadComponent,
    QuizEditorShellComponent,
    QuizNavigatorComponent,
    QuizQuestionToolbarComponent,
    QuizReviewOverlayComponent,
    QuizToastComponent,
  ],
  templateUrl: './create-roulette.component.html',
})
export default class CreateRouletteComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private rouletteService = inject(RouletteService);
  router = inject(Router); // Público para usar en template
  private route = inject(ActivatedRoute);
  private modalService = inject(ModalService);
  private imageCompressionService = inject(ImageCompressionService);
  aiUsage = inject(AiUsageService);

  readonly questionStatus = questionStatus;
  private shell = viewChild(QuizEditorShellComponent);

  rouletteForm: FormGroup;
  loading = signal(false);
  /** True only while the roulette being edited is fetched (the editor stays mounted while saving). */
  loadingData = signal(false);
  error = signal<string | null>(null);
  compressingImages = signal<Set<string>>(new Set());
  isEditMode = signal(false);
  private rouletteId: string | null = null;
  private previewUrls = new Map<FormGroup, string>();

  // Toast notification
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error' | 'warning'>('success');

  readonly instructions = [
    '12 preguntas: 3×100, 2×200, 2×300, 3×400, 2×500',
    'Cada una con pregunta y respuesta',
    'La imagen es opcional',
  ];

  // Editor state
  state = new QuizEditorState(() => this.questions.length);
  /** Bumped on every form change so the computed views below re-evaluate. */
  private version = signal(0);

  navItems = computed<NavItem[]>(() => {
    this.version();
    this.compressingImages();
    return this.questions.controls.map((q) => {
      const value: number = q.get('value')?.value;
      return {
        label: truncate(q.get('question')?.value, 80),
        status: questionStatus(q),
        hasImage: !!this.imagePreviewOf(q as FormGroup),
        badge: String(value),
        badgeClass: VALUE_COLORS[value],
        group: `${value} pts`,
      };
    });
  });

  incompleteTotal = computed(() => {
    this.version();
    return incompleteCount(this.questions.controls);
  });

  /** One-element list that drives the editor panel (rebinds the form group when the selection changes). */
  currentList = computed<FormGroup[]>(() => {
    this.version();
    const group = this.questions.at(this.state.selected()) as FormGroup | undefined;
    return group ? [group] : [];
  });

  reviewCards = computed<ReviewCard[]>(() => {
    this.version();
    return this.questions.controls.map((q, i) => {
      const value: number = q.get('value')?.value;
      const answer: string = q.get('answer')?.value ?? '';
      return {
        key: i,
        number: String(i + 1),
        question: truncate(q.get('question')?.value, 140),
        answers: [{ text: truncate(answer, 80), correct: !!answer.trim() }],
        imageUrl: this.imagePreviewOf(q as FormGroup),
        complete: questionStatus(q) === 'complete',
        missing: missingFields(q, { question: 'Pregunta', answer: 'Respuesta' }),
        badge: String(value),
        badgeClass: VALUE_COLORS[value],
        group: `${value} pts`,
      };
    });
  });

  // Predefined question structure for roulette
  private questionValues = [
    { count: 3, value: 100 },
    { count: 2, value: 200 },
    { count: 2, value: 300 },
    { count: 3, value: 400 },
    { count: 2, value: 500 }
  ];

  constructor() {
    this.rouletteForm = this.fb.group({
      title: ['', Validators.required],
      questions: this.fb.array(
        this.createDefaultQuestions(),
        [Validators.required, Validators.minLength(12)]
      ),
    });
    this.rouletteForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.version.update((v) => v + 1));
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.rouletteId = params.get('id');
          if (this.rouletteId) {
            this.isEditMode.set(true);
            this.loading.set(true);
            this.loadingData.set(true);
            return this.rouletteService.getRouletteById(this.rouletteId);
          }
          return of(null);
        })
      )
      .subscribe({
        next: (roulette) => {
          if (roulette) {
            this.patchForm(roulette);
            this.loading.set(false);
            this.loadingData.set(false);
          }
        },
        error: (err) => {
          this.error.set('Failed to load roulette data.');
          this.loading.set(false);
          this.loadingData.set(false);
          console.error(err);
        },
      });
  }

  ngOnDestroy(): void {
    this.previewUrls.forEach(url => URL.revokeObjectURL(url));
  }

  createDefaultQuestions(): FormGroup[] {
    const questions: FormGroup[] = [];
    this.questionValues.forEach(({ count, value }) => {
      for (let i = 0; i < count; i++) {
        questions.push(this.fb.group({
          question: ['', Validators.required],
          answer: ['', Validators.required],
          value: [value, Validators.required],
          imageUrl: [null],
          imageFile: [null],
        }));
      }
    });
    return questions;
  }

  patchForm(roulette: Roulette) {
    this.rouletteForm.patchValue({
      title: roulette.title,
    });

    this.clearQuestions();

    // Add questions from roulette
    roulette.questions.forEach((q) => {
      const questionGroup = this.fb.group({
        question: [q.question, Validators.required],
        answer: [q.answer, Validators.required],
        value: [q.value, Validators.required],
        imageUrl: [q.imageUrl || null],
        imageFile: [null],
      });
      this.questions.push(questionGroup);
    });

    // If less than 12 questions, fill with default structure
    while (this.questions.length < 12) {
      const defaultQuestions = this.createDefaultQuestions();
      const needed = 12 - this.questions.length;
      for (let i = 0; i < needed && i < defaultQuestions.length; i++) {
        this.questions.push(defaultQuestions[i]);
      }
    }
    this.state.select(0);
  }

  get questions() {
    return this.rouletteForm.get('questions') as FormArray;
  }

  get titleControl() {
    return this.rouletteForm.get('title') as FormControl;
  }

  private imagePreviewOf(group: FormGroup): string | null {
    return this.previewUrls.get(group) || group.get('imageUrl')?.value || null;
  }

  private clearQuestions() {
    this.previewUrls.forEach(url => URL.revokeObjectURL(url));
    this.previewUrls.clear();
    while (this.questions.length !== 0) {
      this.questions.removeAt(0);
    }
  }

  async onFileSelected(eventOrFile: Event | File, questionIndex: number) {
    let file: File;

    if (eventOrFile instanceof File) {
      file = eventOrFile;
    } else {
      const fileInput = eventOrFile.target as HTMLInputElement;
      if (!fileInput.files || fileInput.files.length === 0) {
        return;
      }
      file = fileInput.files[0];
    }
    const imageId = `question-${questionIndex}`;

    // First validate file type
    if (!file.type.startsWith('image/')) {
      this.error.set('Por favor, selecciona un archivo de imagen válido.');
      return;
    }

    // Clear any previous error
    this.error.set(null);

    try {
      // Add to compressing set if file is large
      const maxSizeBytes = 3 * 1024 * 1024; // 3 MB
      if (file.size > maxSizeBytes) {
        this.compressingImages.update(set => new Set(set).add(imageId));
      }

      // Compress image using the service
      const result = await this.imageCompressionService.compressImage(file);

      // Remove from compressing set
      this.compressingImages.update(set => {
        const newSet = new Set(set);
        newSet.delete(imageId);
        return newSet;
      });

      // Log compression results if compression occurred
      if (result.wasCompressed) {
        console.log(`Imagen comprimida: ${this.imageCompressionService.formatFileSize(result.originalSize)} → ${this.imageCompressionService.formatFileSize(result.compressedSize)} (${result.compressionRatio.toFixed(1)}% reducción)`);
      }

      // Final validation after compression
      const validation = this.imageCompressionService.validateImageFile(result.file);
      if (!validation.isValid) {
        this.error.set(validation.errorMessage!);
        return;
      }

      const questionGroup = this.questions.at(questionIndex) as FormGroup;

      if (this.previewUrls.has(questionGroup)) {
        URL.revokeObjectURL(this.previewUrls.get(questionGroup)!);
      }

      const previewUrl = URL.createObjectURL(result.file);
      this.previewUrls.set(questionGroup, previewUrl);

      questionGroup.patchValue({
        imageFile: result.file,
        imageUrl: null, // Clear existing URL when a new file is selected
      });
      questionGroup.markAsDirty();

    } catch (error) {
      // Remove from compressing set on error
      this.compressingImages.update(set => {
        const newSet = new Set(set);
        newSet.delete(imageId);
        return newSet;
      });

      console.error('Error al procesar la imagen:', error);
      this.error.set('Error al procesar la imagen. Por favor, intenta con otra imagen.');
    }
  }

  removeImage(questionIndex: number) {
    const questionGroup = this.questions.at(questionIndex) as FormGroup;
    if (this.previewUrls.has(questionGroup)) {
      URL.revokeObjectURL(this.previewUrls.get(questionGroup)!);
      this.previewUrls.delete(questionGroup);
    }
    questionGroup.patchValue({
      imageFile: null,
      imageUrl: null,
    });
    questionGroup.markAsDirty();
  }

  getPreviewUrl(questionIndex: number): string | null {
    return this.imagePreviewOf(this.questions.at(questionIndex) as FormGroup);
  }

  isImageCompressing(questionIndex: number): boolean {
    const imageId = `question-${questionIndex}`;
    return this.compressingImages().has(imageId);
  }

  generateRouletteWithAI() {
    this.modalService.openInput({
      title: 'Generar Ruleta con IA',
      message: 'Ingresa un tema o pega un texto para generar una ruleta automáticamente:'
    }).then((input) => {
      if (input && input.trim()) {
        this.loading.set(true);
        this.error.set(null);

        // Determine if input is a topic (short) or text (long)
        const params = input.trim().length > 100
          ? { text: input.trim() }
          : { topic: input.trim() };

        this.rouletteService.generateRouletteWithAI(params).subscribe({
          next: (aiResponse) => {
            // Update form title
            this.rouletteForm.patchValue({
              title: aiResponse.title
            });

            this.clearQuestions();

            // Add AI generated questions
            aiResponse.questions.forEach((q) => {
              const questionGroup = this.fb.group({
                question: [q.question, Validators.required],
                answer: [q.answer, Validators.required],
                value: [q.value, Validators.required],
                imageUrl: [null],
                imageFile: [null],
              });
              this.questions.push(questionGroup);
            });

            // If less than 12 questions, fill with default structure
            while (this.questions.length < 12) {
              const defaultQuestions = this.createDefaultQuestions();
              const needed = 12 - this.questions.length;
              for (let i = 0; i < needed && i < defaultQuestions.length; i++) {
                this.questions.push(defaultQuestions[i]);
              }
            }

            this.rouletteForm.markAsDirty();
            this.state.select(0);
            this.loading.set(false);
            this.aiUsage.load();
          },
          error: (err) => {
            console.error('Error generating roulette with AI:', err);
            const quotaMessage = this.aiUsage.handleError(err);
            if (quotaMessage) {
              this.showToastNotification(quotaMessage, 'warning');
              this.loading.set(false);
              return;
            }
            let errorMessage = 'Error al generar la ruleta con IA. Por favor, inténtalo de nuevo.';
            if (err.error && err.error.message) {
              errorMessage = Array.isArray(err.error.message)
                ? err.error.message.join(', ')
                : err.error.message;
            }
            this.error.set(errorMessage);
            this.loading.set(false);
          }
        });
      }
    });
  }

  onSubmit() {
    this.rouletteForm.markAllAsTouched();
    if (this.rouletteForm.invalid) {
      this.error.set('Por favor, completa todos los campos requeridos.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.uploadImages().pipe(
      switchMap(() => this.saveRoulette())
    ).subscribe({
      next: () => {
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        let errorMessage =
          'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.';
        if (err.error && err.error.message) {
          errorMessage = Array.isArray(err.error.message)
            ? err.error.message.join(', ')
            : err.error.message;
        }
        this.error.set(errorMessage);
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  private uploadImages(): Observable<void> {
    const uploadTasks: { question: FormGroup; imageFile: File; index: number }[] = [];
    this.questions.controls.forEach((question, index) => {
      const imageFile = question.get('imageFile')?.value;
      if (imageFile) {
        uploadTasks.push({ question: question as FormGroup, imageFile, index });
      }
    });

    if (uploadTasks.length === 0) {
      return of(void 0);
    }

    const uploadObservables = uploadTasks.map((task) =>
      this.rouletteService.uploadQuestionImage(task.imageFile)
    );

    return forkJoin(uploadObservables).pipe(
      tap((responses) => {
        responses.forEach((response, index) => {
          const task = uploadTasks[index];
          task.question.patchValue({
            imageUrl: response.imageUrl,
            imageFile: null,
          });
        });
      }),
      map(() => void 0)
    );
  }

  private saveRoulette(): Observable<Roulette> {
    const formValue = this.rouletteForm.getRawValue();

    const rouletteData = {
      title: formValue.title,
      questions: formValue.questions.map((q: any) => ({
        question: q.question,
        answer: q.answer,
        value: q.value,
        imageUrl: q.imageUrl || null,
      })),
    };

    const saveObservable: Observable<Roulette> = this.isEditMode()
      ? this.rouletteService.updateRoulette(this.rouletteId!, rouletteData)
      : this.rouletteService.createRoulette(rouletteData);

    return saveObservable;
  }

  showToastNotification(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    this.toastMessage.set(message);
    this.toastType.set(type);
    this.showToast.set(true);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.showToast.set(false);
    }, 3000);
  }

  /** Save button: invalid forms jump to the first incomplete item instead of submitting. */
  onSaveClick() {
    if (this.loading()) {
      return;
    }

    if (!this.rouletteForm.valid) {
      this.showToastNotification('⚠️ Por favor, complete todos los campos requeridos', 'warning');
      this.rouletteForm.markAllAsTouched();
      this.jumpToFirstIncomplete();
      return;
    }

    this.onSubmit();
  }

  jumpToFirstIncomplete() {
    if (this.titleControl.invalid) {
      this.shell()?.focusTitle();
      return;
    }
    const index = firstIncompleteIndex(this.questions.controls);
    if (index >= 0) {
      this.state.select(index);
    }
  }

  async cancel() {
    if (this.rouletteForm.dirty) {
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
}
