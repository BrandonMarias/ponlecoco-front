import { Component, inject, signal, computed, viewChild, OnInit, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
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
import { AiUsageService } from '../../shared/ai-usage.service';
import { QuizEditorShellComponent } from '../../shared/quiz-editor/quiz-editor-shell.component';
import { QuizNavigatorComponent } from '../../shared/quiz-editor/quiz-navigator.component';
import { QuizQuestionToolbarComponent } from '../../shared/quiz-editor/quiz-question-toolbar.component';
import { QuizReviewOverlayComponent } from '../../shared/quiz-editor/quiz-review-overlay.component';
import { QuizToastComponent } from '../../shared/quiz-editor/quiz-toast.component';
import { QuizIconComponent, QuizIconName } from '../../shared/quiz-editor/quiz-icon.component';
import { QuizEditorState } from '../../shared/quiz-editor/quiz-editor-state';
import {
  NavItem,
  ReviewCard,
  firstIncompleteIndex,
  incompleteCount,
  insertAfter,
  missingFields,
  moveItem,
  questionStatus,
  removeItem,
  truncate,
} from '../../shared/quiz-editor/quiz-editor.utils';

interface OptionTile {
  tile: string;
  shape: QuizIconName;
  color: string;
}

@Component({
  selector: 'app-create-quick-thinking',
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
    QuizIconComponent,
  ],
  templateUrl: './create-quick-thinking.component.html',
})
export default class CreateQuickThinkingComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private quickThinkingService = inject(QuickThinkingService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private modalService = inject(ModalService);
  private imageCompressionService = inject(ImageCompressionService);
  aiUsage = inject(AiUsageService);

  readonly questionStatus = questionStatus;
  private shell = viewChild(QuizEditorShellComponent);

  quickThinkingForm: FormGroup;
  loading = signal(false);
  /** True only while the quiz being edited is fetched (the editor itself stays mounted while saving). */
  loadingData = signal(false);
  error = signal<string | null>(null);
  compressingImages = signal<Set<AbstractControl>>(new Set());
  isEditMode = signal(false);
  private quickThinkingId: string | null = null;
  // Keyed by question group so previews survive reordering / deleting questions.
  private previewUrls = new Map<AbstractControl, string>();

  // Constants
  readonly MAX_QUESTIONS = 30;
  readonly instructions = [
    '4 opciones por pregunta',
    'Toca ✓ en la opción correcta',
    'La imagen es opcional',
    'Hasta 30 preguntas',
  ];
  readonly optionTiles: OptionTile[] = [
    { tile: 'bg-red-600', shape: 'triangle', color: 'rojo' },
    { tile: 'bg-blue-600', shape: 'diamond', color: 'azul' },
    { tile: 'bg-amber-600', shape: 'circle', color: 'amarillo' },
    { tile: 'bg-green-600', shape: 'square', color: 'verde' },
  ];

  // Toast notification
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error' | 'warning'>('success');

  // Editor state
  state = new QuizEditorState(() => this.questions.length);
  /** Bumped on every form change so the computed views below re-evaluate. */
  private version = signal(0);

  navItems = computed<NavItem[]>(() => {
    this.version();
    this.compressingImages();
    return this.questions.controls.map((q) => ({
      label: truncate(q.get('question')?.value, 80),
      status: questionStatus(q),
      hasImage: !!this.imagePreviewOf(q as FormGroup),
    }));
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
      const options: string[] = q.get('options')?.value ?? [];
      const correct = q.get('correctAnswerIndex')?.value;
      return {
        key: i,
        number: String(i + 1),
        question: truncate(q.get('question')?.value, 140),
        answers: options.map((text, idx) => ({ text: truncate(text, 60), correct: idx === correct })),
        imageUrl: this.imagePreviewOf(q as FormGroup),
        complete: questionStatus(q) === 'complete',
        missing: missingFields(q, { question: 'Pregunta', options: 'Opción', correctAnswerIndex: 'Correcta' }),
      };
    });
  });

  constructor() {
    this.quickThinkingForm = this.fb.group({
      title: ['', Validators.required],
      questions: this.fb.array(
        [this.createQuestionGroup()],
        [Validators.required, Validators.minLength(1)]
      ),
    });
    this.quickThinkingForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.version.update((v) => v + 1));
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.quickThinkingId = params.get('id');
          if (this.quickThinkingId) {
            this.isEditMode.set(true);
            this.loading.set(true);
            this.loadingData.set(true);
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
            this.loadingData.set(false);
          }
        },
        error: (err) => {
          this.error.set('Error al cargar la trivia.');
          this.loading.set(false);
          this.loadingData.set(false);
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

    this.clearQuestions();

    // Add questions from quick thinking
    quickThinking.questions.forEach((q) => {
      // Asegurar que siempre haya exactamente 4 opciones válidas
      const validOptions = q.options.filter(opt => opt && opt.trim() !== '').slice(0, 4);
      while (validOptions.length < 4) {
        validOptions.push(''); // Rellenar con strings vacíos si faltan opciones
      }

      const questionGroup = this.fb.group({
        question: [q.question, Validators.required],
        options: this.fb.array(
          validOptions.map(opt => this.fb.control(opt, Validators.required))
        ),
        correctAnswerIndex: [q.correctAnswerIndex, [Validators.required, Validators.min(0), Validators.max(3)]],
        imageUrl: [q.imageUrl || null],
        imageFile: [null],
      });
      this.questions.push(questionGroup);
    });
    this.state.select(0);
  }

  get questions() {
    return this.quickThinkingForm.get('questions') as FormArray;
  }

  get titleControl() {
    return this.quickThinkingForm.get('title') as FormControl;
  }

  optionsOf(group: FormGroup): FormControl[] {
    return (group.get('options') as FormArray).controls as FormControl[];
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
    this.questions.markAsDirty();
    this.state.select(this.questions.length - 1);
  }

  duplicateQuestion(index: number) {
    if (this.questions.length >= this.MAX_QUESTIONS) {
      this.showToastNotification(`No se pueden agregar más de ${this.MAX_QUESTIONS} preguntas`, 'warning');
      return;
    }
    const source = this.questions.at(index) as FormGroup;
    const copy = this.createQuestionGroup();
    copy.patchValue(source.getRawValue());

    // A not-yet-uploaded image gets its own preview URL so each question can be edited/removed independently.
    const file: File | null = source.get('imageFile')?.value;
    if (file && this.previewUrls.has(source)) {
      this.previewUrls.set(copy, URL.createObjectURL(file));
    }

    this.state.select(insertAfter(this.questions, index, copy));
  }

  moveQuestion(index: number, delta: -1 | 1) {
    this.state.select(moveItem(this.questions, index, delta));
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
      this.revokePreview(this.questions.at(index) as FormGroup);
      this.state.afterRemove(removeItem(this.questions, index));
    }
  }

  setCorrectAnswer(group: FormGroup, optionIndex: number) {
    const control = group.get('correctAnswerIndex')!;
    control.setValue(optionIndex);
    control.markAsDirty();
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

    const questionGroup = this.questions.at(questionIndex) as FormGroup;

    // Clean up previous preview URL
    const oldPreviewUrl = this.previewUrls.get(questionGroup);
    if (oldPreviewUrl) {
      URL.revokeObjectURL(oldPreviewUrl);
    }

    // Compress image
    this.compressingImages.update(set => new Set(set).add(questionGroup));

    try {
      const result = await this.imageCompressionService.compressImage(file);

      // Remove from compressing set
      this.compressingImages.update(set => {
        const newSet = new Set(set);
        newSet.delete(questionGroup);
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
      this.previewUrls.set(questionGroup, previewUrl);

      // Store the compressed file (not the result object)
      questionGroup.patchValue({
        imageFile: result.file,
        imageUrl: null // Clear existing URL when a new file is selected
      });
      questionGroup.markAsDirty();
    } catch (error) {
      console.error('Error compressing image:', error);

      // Remove from compressing set on error
      this.compressingImages.update(set => {
        const newSet = new Set(set);
        newSet.delete(questionGroup);
        return newSet;
      });

      this.error.set('Error al comprimir la imagen. Por favor, inténtalo de nuevo.');
      this.showToastNotification('No se pudo comprimir la imagen', 'error');
    }
  }

  removeImage(questionIndex: number) {
    const questionGroup = this.questions.at(questionIndex) as FormGroup;
    questionGroup.patchValue({
      imageUrl: null,
      imageFile: null
    });
    questionGroup.markAsDirty();
    this.revokePreview(questionGroup);
  }

  getImagePreview(questionIndex: number): string | null {
    return this.imagePreviewOf(this.questions.at(questionIndex) as FormGroup);
  }

  isCompressing(group: FormGroup): boolean {
    return this.compressingImages().has(group);
  }

  hasImageFile(questionIndex: number): boolean {
    const questionGroup = this.questions.at(questionIndex);
    return !!questionGroup.get('imageFile')?.value;
  }

  private imagePreviewOf(group: FormGroup): string | null {
    return this.previewUrls.get(group) || group.get('imageUrl')?.value || null;
  }

  private revokePreview(group: FormGroup) {
    const previewUrl = this.previewUrls.get(group);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      this.previewUrls.delete(group);
    }
  }

  private clearQuestions() {
    this.questions.controls.forEach(q => this.revokePreview(q as FormGroup));
    while (this.questions.length !== 0) {
      this.questions.removeAt(0);
    }
  }

  /** Save button: invalid forms jump to the first incomplete item instead of submitting. */
  onSaveClick() {
    if (this.loading()) {
      return;
    }
    if (this.quickThinkingForm.invalid) {
      this.quickThinkingForm.markAllAsTouched();
      this.jumpToFirstIncomplete();
      this.showToastNotification('Por favor completa todos los campos requeridos', 'error');
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
        questions: formValue.questions.map((q: any, index: number) => {
          // Asegurar que cada pregunta tenga exactamente 4 opciones válidas
          const validOptions = q.options.filter((opt: string) => opt && opt.trim() !== '').slice(0, 4);
          while (validOptions.length < 4) {
            validOptions.push(''); // Rellenar con strings vacíos si faltan opciones
          }

          return {
            question: q.question,
            options: validOptions,
            correctAnswerIndex: q.correctAnswerIndex,
            imageUrl: imageResults?.[index]?.imageUrl || null,
          };
        }),
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

        this.clearQuestions();

        // Add generated questions
        response.questions.forEach((q: any) => {
          // Asegurar que siempre haya exactamente 4 opciones válidas
          const validOptions = q.options.filter((opt: string) => opt && opt.trim() !== '').slice(0, 4);
          while (validOptions.length < 4) {
            validOptions.push(''); // Rellenar con strings vacíos si faltan opciones
          }

          const questionGroup = this.fb.group({
            question: [q.question, Validators.required],
            options: this.fb.array(
              validOptions.map((opt: string) => this.fb.control(opt, Validators.required))
            ),
            correctAnswerIndex: [q.correctAnswerIndex, [Validators.required, Validators.min(0), Validators.max(3)]],
            imageUrl: [null],
            imageFile: [null],
          });
          this.questions.push(questionGroup);
        });

        this.quickThinkingForm.markAsDirty();
        this.state.select(0);
        this.showToastNotification('✅ Preguntas generadas exitosamente', 'success');
        this.aiUsage.load();
      },
      error: (err) => {
        console.error('Error generating questions:', err);
        const quotaMessage = this.aiUsage.handleError(err);
        if (quotaMessage) {
          this.showToastNotification(quotaMessage, 'warning');
          return;
        }
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
