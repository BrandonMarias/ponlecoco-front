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
import { TriviaPartyService } from '../triviaparty.service';
import { finalize, switchMap, of, Observable, forkJoin, map, tap } from 'rxjs';
import { TriviaParty } from '../triviaparty';
import { AiService } from '../../shared/ai.service';
import { ModalService } from '../../shared/modal.service';
import { AiCategoryResponse } from '../../shared/ai.interface';
import { ImageCompressionService } from '../../shared/image-compression.service';
import { ImageUploadComponent } from '../../shared/image-upload/image-upload.component';
import { AiUsageService } from '../../shared/ai-usage.service';
import { QuizEditorShellComponent } from '../../shared/quiz-editor/quiz-editor-shell.component';
import { QuizQuestionToolbarComponent } from '../../shared/quiz-editor/quiz-question-toolbar.component';
import { QuizReviewOverlayComponent } from '../../shared/quiz-editor/quiz-review-overlay.component';
import { QuizToastComponent } from '../../shared/quiz-editor/quiz-toast.component';
import { QuizIconComponent } from '../../shared/quiz-editor/quiz-icon.component';
import { QuizStatusDotComponent } from '../../shared/quiz-editor/quiz-status-dot.component';
import {
  QuestionStatus,
  ReviewCard,
  missingFields,
  questionStatus,
  truncate,
} from '../../shared/quiz-editor/quiz-editor.utils';

const MAX_CATEGORIES = 6;

interface CategoryTab {
  title: string;
  status: QuestionStatus;
}

interface ValueChip {
  value: number;
  status: QuestionStatus;
  hasImage: boolean;
  double: boolean;
  /** Something typed already (drives the amber "partial" icon; untouched tiles stay neutral). */
  started: boolean;
}

@Component({
  selector: 'app-create-triviaparty',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ImageUploadComponent,
    QuizEditorShellComponent,
    QuizQuestionToolbarComponent,
    QuizReviewOverlayComponent,
    QuizToastComponent,
    QuizIconComponent,
    QuizStatusDotComponent,
  ],
  templateUrl: './create-triviaparty.component.html',
})
export default class CreateTriviaPartyComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private triviaPartyService = inject(TriviaPartyService);
  router = inject(Router); // Público para usar en template
  private route = inject(ActivatedRoute);
  private aiService = inject(AiService);
  private modalService = inject(ModalService);
  private imageCompressionService = inject(ImageCompressionService);
  aiUsage = inject(AiUsageService);

  readonly MAX_CATEGORIES = MAX_CATEGORIES;
  readonly questionStatus = questionStatus;
  private shell = viewChild(QuizEditorShellComponent);

  triviaPartyForm: FormGroup;
  loading = signal(false);
  /** True only while the trivia being edited is fetched (the editor stays mounted while saving). */
  loadingData = signal(false);
  error = signal<string | null>(null);
  compressingImages = signal<Set<string>>(new Set());
  isEditMode = signal(false);
  private triviaPartyId: string | null = null;
  private previewUrls = new Map<FormGroup, string>();

  // Toast notification
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error' | 'warning'>('success');

  readonly instructions = [
    `Hasta ${MAX_CATEGORIES} categorías`,
    '5 preguntas por categoría: 100 a 500',
    '⚡ marca una pregunta con puntos dobles (opcional)',
    'La imagen es opcional',
  ];

  // Selection: category tab + value chip
  selCat = signal(0);
  selQ = signal(0);
  reviewOpen = signal(false);
  /** Validation colours only show after a save attempt, so fresh empty fields stay neutral. */
  submitted = signal(false);
  /** Bumped on every form change so the computed views below re-evaluate. */
  private version = signal(0);

  categoryTabs = computed<CategoryTab[]>(() => {
    this.version();
    return this.categories.controls.map((cat) => ({
      title: truncate(cat.get('title')?.value, 24),
      status: questionStatus(cat),
    }));
  });

  valueChips = computed<ValueChip[]>(() => {
    this.version();
    this.compressingImages();
    const c = this.selCat();
    if (c >= this.categories.length) {
      return [];
    }
    return this.questions(c).controls.map((q, i) => ({
      value: q.get('value')?.value,
      status: questionStatus(q),
      hasImage: !!this.imagePreviewOf(q as FormGroup),
      double: this.isDoublePoints(c, i),
      started: !!(q.get('question')?.value?.trim() || q.get('answer')?.value?.trim()),
    }));
  });

  /** Incomplete questions + categories without a title. */
  incompleteTotal = computed(() => {
    this.version();
    return this.categories.controls.reduce((total, cat) => {
      const titleMissing = cat.get('title')?.invalid ? 1 : 0;
      const questionsMissing = (cat.get('questions') as FormArray).controls.filter(
        (q) => questionStatus(q) === 'incomplete'
      ).length;
      return total + titleMissing + questionsMissing;
    }, 0);
  });

  /** One-element list that drives the editor panel (rebinds the form group when the selection changes). */
  currentList = computed<FormGroup[]>(() => {
    this.version();
    const c = this.selCat();
    if (c >= this.categories.length) {
      return [];
    }
    const group = this.questions(c).at(this.selQ()) as FormGroup | undefined;
    return group ? [group] : [];
  });

  /** Position over all questions (category by category) for the pager. */
  linearIndex = computed(() => {
    this.version();
    const c = this.selCat();
    let before = 0;
    for (let i = 0; i < c && i < this.categories.length; i++) {
      before += this.questions(i).length;
    }
    return before + this.selQ();
  });

  totalQuestions = computed(() => {
    this.version();
    return this.categories.controls.reduce((n, cat) => n + (cat.get('questions') as FormArray).length, 0);
  });

  reviewCards = computed<ReviewCard[]>(() => {
    this.version();
    const cards: ReviewCard[] = [];
    this.categories.controls.forEach((cat, c) => {
      const title: string = cat.get('title')?.value ?? '';
      this.questions(c).controls.forEach((q, qi) => {
        const answer: string = q.get('answer')?.value ?? '';
        const double = this.isDoublePoints(c, qi);
        cards.push({
          key: cards.length,
          number: String(q.get('value')?.value),
          question: truncate(q.get('question')?.value, 140),
          answers: [{ text: truncate(answer, 80), correct: !!answer.trim() }],
          imageUrl: this.imagePreviewOf(q as FormGroup),
          complete: questionStatus(q) === 'complete',
          missing: missingFields(q, { question: 'Pregunta', answer: 'Respuesta' }),
          badge: double ? '×2' : undefined,
          badgeClass: 'bg-amber-500',
          group: truncate(title, 40),
          groupIncomplete: !title.trim() && !!cat.get('title')?.invalid,
        });
      });
    });
    return cards;
  });

  constructor() {
    this.triviaPartyForm = this.fb.group({
      title: ['', Validators.required],
      categories: this.fb.array(
        [],
        [Validators.required, Validators.minLength(1)]
      ),
    });
    this.triviaPartyForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.version.update((v) => v + 1));
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.triviaPartyId = params.get('id');
          if (this.triviaPartyId) {
            this.isEditMode.set(true);
            this.loading.set(true);
            this.loadingData.set(true);
            return this.triviaPartyService.getTriviaPartyById(this.triviaPartyId);
          }
          return of(null);
        })
      )
      .subscribe({
        next: (triviaParty) => {
          if (triviaParty) {
            this.patchForm(triviaParty);
            this.loading.set(false);
            this.loadingData.set(false);
          }
        },
        error: (err) => {
          this.error.set('Failed to load trivia party data.');
          this.loading.set(false);
          this.loadingData.set(false);
          console.error(err);
        },
      });
  }

  ngOnDestroy(): void {
    this.previewUrls.forEach(url => URL.revokeObjectURL(url));
  }

  patchForm(triviaParty: TriviaParty) {
    this.triviaPartyForm.patchValue({
      title: triviaParty.title,
    });

    triviaParty.categories.forEach((cat) => {
      const questionsFGs = cat.questions.map((q) => {
        return this.fb.group({
          question: [q.question, Validators.required],
          answer: [q.answer, Validators.required],
          value: [q.value, Validators.required],
          imageUrl: [q.imageUrl || null],
          imageFile: [null],
        });
      });

      const doublePointsQuestionIndex = cat.questions
        .findIndex((q) => q.doublePoints)
        .toString();

      const categoryGroup = this.fb.group({
        title: [cat.title, Validators.required],
        questions: this.fb.array(questionsFGs),
        doublePointsQuestion: [
          doublePointsQuestionIndex !== '-1' ? doublePointsQuestionIndex : null,
        ],
      });

      this.categories.push(categoryGroup);
    });
    this.selectCategory(0);
  }

  get categories() {
    return this.triviaPartyForm.get('categories') as FormArray;
  }

  get titleControl() {
    return this.triviaPartyForm.get('title') as FormControl;
  }

  categoryTitle(index: number): FormControl {
    return this.categories.at(index).get('title') as FormControl;
  }

  // --- Selection -----------------------------------------------------------

  selectCategory(index: number) {
    const last = this.categories.length - 1;
    this.selCat.set(last < 0 ? 0 : Math.min(Math.max(index, 0), last));
    this.selQ.set(0);
  }

  selectQuestion(index: number) {
    this.selQ.set(Math.min(Math.max(index, 0), Math.max(this.questions(this.selCat()).length - 1, 0)));
  }

  /** Selects by position over all questions (pager, review cards). */
  selectLinear(position: number) {
    let remaining = position;
    for (let c = 0; c < this.categories.length; c++) {
      const count = this.questions(c).length;
      if (remaining < count) {
        this.selCat.set(c);
        this.selQ.set(Math.max(remaining, 0));
        return;
      }
      remaining -= count;
    }
  }

  pickFromReview(position: number | string) {
    this.reviewOpen.set(false);
    this.selectLinear(Number(position));
  }

  // --- Categories ----------------------------------------------------------

  addCategory() {
    if (this.categories.length >= MAX_CATEGORIES) {
      this.showToastNotification('Solo se permiten 6 categorías', 'warning');
      return;
    }

    const categoryGroup = this.fb.group({
      title: ['', Validators.required],
      questions: this.fb.array(this.createFiveQuestions()),
      doublePointsQuestion: [null],
    });
    this.categories.push(categoryGroup);
    this.categories.markAsDirty();
    this.selectCategory(this.categories.length - 1);
    this.focusCategoryTitle(this.selCat());
  }

  async addCategoryWithIA() {
    const input = await this.modalService.openInput({
      title: 'Generar Categoría con IA',
      message: 'Introduce un tema o pega un texto para generar la categoría y las preguntas.',
    });

    if (input && input.trim()) {
      this.loading.set(true);

      // Determine if input is a topic (short) or text (long)
      const params = input.trim().length > 100
        ? { text: input.trim() }
        : { topic: input.trim() };

      this.aiService
        .generateCategory(params)
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (response) => {
            this.addCategoryFromIA(response);
            this.aiUsage.load();
          },
          error: (err) => {
            const quotaMessage = this.aiUsage.handleError(err);
            if (quotaMessage) {
              this.showToastNotification(quotaMessage, 'warning');
              return;
            }
            this.error.set(err.error?.message || 'An unexpected error occurred.');
          },
        });
    }
  }

  addCategoryFromIA(data: AiCategoryResponse) {
    const randomIndex = Math.floor(Math.random() * 5).toString();
    const categoryGroup = this.fb.group({
      title: [data.category, Validators.required],
      doublePointsQuestion: [randomIndex],
      questions: this.fb.array(
        data.questions.map((q) =>
          this.fb.group({
            question: [q.question, Validators.required],
            answer: [q.answer, Validators.required],
            value: [q.value, Validators.required],
            imageUrl: [null],
            imageFile: [null],
          })
        )
      ),
    });
    this.categories.push(categoryGroup);
    this.categories.markAsDirty();
    this.selectCategory(this.categories.length - 1);
  }

  async removeCategory(index: number) {
    const confirmed = await this.modalService.open({
      title: 'Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar esta categoría?'
    });
    if (!confirmed) {
      return;
    }

    this.questions(index).controls.forEach(questionControl => {
      const questionGroup = questionControl as FormGroup;
      if (this.previewUrls.has(questionGroup)) {
        URL.revokeObjectURL(this.previewUrls.get(questionGroup)!);
        this.previewUrls.delete(questionGroup);
      }
    });
    this.categories.removeAt(index);
    this.categories.markAsDirty();
    this.selectCategory(Math.min(index, this.categories.length - 1));
  }

  createFiveQuestions(): FormGroup[] {
    const values = [100, 200, 300, 400, 500];
    return values.map((value) =>
      this.fb.group({
        question: ['', Validators.required],
        answer: ['', Validators.required],
        value: [value, Validators.required],
        imageUrl: [null],
        imageFile: [null],
      })
    );
  }

  questions(categoryIndex: number): FormArray {
    return this.categories.at(categoryIndex).get('questions') as FormArray;
  }

  isDoublePoints(categoryIndex: number, questionIndex: number): boolean {
    return this.categories.at(categoryIndex).get('doublePointsQuestion')?.value === questionIndex.toString();
  }

  toggleDoublePoints(categoryIndex: number, questionIndex: string) {
    const category = this.categories.at(categoryIndex) as FormGroup;
    const doublePointsControl = category.get('doublePointsQuestion');

    if (doublePointsControl?.value === questionIndex) {
      doublePointsControl.setValue(null);
    } else {
      doublePointsControl?.setValue(questionIndex);
    }
    doublePointsControl?.markAsDirty();
  }

  // --- Images --------------------------------------------------------------

  // Wrapper method for the shared component
  async onFileSelectedFromComponent(file: File, catIndex: number, qIndex: number) {
    // Create a mock event for compatibility with existing method
    const mockEvent = {
      target: {
        files: [file]
      }
    } as any;
    await this.onFileSelected(mockEvent, catIndex, qIndex);
  }

  async onFileSelected(event: Event, catIndex: number, qIndex: number) {
    const fileInput = event.target as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0) {
      return;
    }

    const file = fileInput.files[0];
    const imageId = `${catIndex}-${qIndex}`;

    // First validate file type
    if (!file.type.startsWith('image/')) {
      this.error.set('Por favor, selecciona un archivo de imagen válido.');
      fileInput.value = '';
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
        fileInput.value = '';
        return;
      }

      const questionGroup = this.questions(catIndex).at(qIndex) as FormGroup;

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
      fileInput.value = '';
    }
  }

  removeImage(catIndex: number, qIndex: number) {
    const questionGroup = this.questions(catIndex).at(qIndex) as FormGroup;
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

  getPreviewUrl(catIndex: number, qIndex: number): string | null {
    return this.imagePreviewOf(this.questions(catIndex).at(qIndex) as FormGroup);
  }

  isImageCompressing(catIndex: number, qIndex: number): boolean {
    const imageId = `${catIndex}-${qIndex}`;
    return this.compressingImages().has(imageId);
  }

  private imagePreviewOf(group: FormGroup): string | null {
    return this.previewUrls.get(group) || group.get('imageUrl')?.value || null;
  }

  // --- Save ----------------------------------------------------------------

  onSubmit() {
    this.triviaPartyForm.markAllAsTouched();
    if (this.triviaPartyForm.invalid) {
      this.error.set('Por favor, completa todos los campos requeridos.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.uploadImages().pipe(
      switchMap(() => this.saveTriviaParty())
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
    const uploadTasks: { question: AbstractControl; imageFile: File }[] = [];
    this.categories.controls.forEach((category) => {
      (category.get('questions') as FormArray).controls.forEach((question) => {
        const imageFile = question.get('imageFile')?.value;
        if (imageFile) {
          uploadTasks.push({ question, imageFile });
        }
      });
    });

    if (uploadTasks.length === 0) {
      return of(void 0);
    }

    const uploadObservables = uploadTasks.map((task) =>
      this.triviaPartyService.uploadQuestionImage(task.imageFile)
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

  private saveTriviaParty(): Observable<TriviaParty> {
    const formValue = this.triviaPartyForm.getRawValue();

    const triviaPartyData = {
      title: formValue.title,
      categories: formValue.categories.map((cat: any) => ({
        title: cat.title,
        questions: cat.questions.map((q: any, qIndex: number) => {
          const questionPayload: any = {
            question: q.question,
            answer: q.answer,
            value: q.value,
            imageUrl: q.imageUrl || null,
          };
          if (cat.doublePointsQuestion === qIndex.toString()) {
            questionPayload.doublePoints = true;
          }
          return questionPayload;
        }),
      })),
    };

    const saveObservable: Observable<TriviaParty> = this.isEditMode()
      ? this.triviaPartyService.updateTriviaParty(this.triviaPartyId!, triviaPartyData)
      : this.triviaPartyService.createTriviaParty(triviaPartyData);

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

  onAddCategoryClick() {
    if (this.categories.length >= MAX_CATEGORIES) {
      this.showToastNotification('⚠️ Máximo 6 categorías permitidas', 'warning');
      return;
    }
    this.addCategory();
  }

  async onAddCategoryWithIAClick() {
    if (this.categories.length >= MAX_CATEGORIES) {
      this.showToastNotification('⚠️ Máximo 6 categorías permitidas', 'warning');
      return;
    }
    await this.addCategoryWithIA();
  }

  /** Save button: invalid forms jump to the first incomplete item instead of submitting. */
  onSaveClick() {
    if (this.loading()) {
      return;
    }

    this.submitted.set(true);
    if (!this.triviaPartyForm.valid) {
      this.showToastNotification('⚠️ Por favor, complete todos los campos requeridos', 'warning');
      this.triviaPartyForm.markAllAsTouched();
      this.jumpToFirstIncomplete();
      return;
    }

    this.onSubmit();
  }

  /** Quiz title first, then category by category: its title, then its questions. */
  jumpToFirstIncomplete() {
    if (this.titleControl.invalid) {
      this.shell()?.focusTitle();
      return;
    }
    for (let c = 0; c < this.categories.length; c++) {
      if (this.categoryTitle(c).invalid) {
        this.selectCategory(c);
        this.focusCategoryTitle(c);
        return;
      }
      const q = this.questions(c).controls.findIndex((control) => questionStatus(control) === 'incomplete');
      if (q >= 0) {
        this.selCat.set(c);
        this.selQ.set(q);
        return;
      }
    }
  }

  async cancel() {
    if (this.triviaPartyForm.dirty) {
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

  private focusCategoryTitle(index: number) {
    setTimeout(() => document.getElementById('cat-title-' + index)?.focus());
  }
}
