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
import { RouletteService } from '../roulette.service';
import { finalize, switchMap, of, Observable, forkJoin, map, tap } from 'rxjs';
import { Roulette } from '../roulette';
import { ModalService } from '../../shared/modal.service';
import { ImageCompressionService } from '../../shared/image-compression.service';
import QuestionFormComponent from '../../shared/question-form/question-form.component';

@Component({
  selector: 'app-create-roulette',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, QuestionFormComponent],
  templateUrl: './create-roulette.component.html',
})
export default class CreateRouletteComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private rouletteService = inject(RouletteService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private modalService = inject(ModalService);
  private imageCompressionService = inject(ImageCompressionService);

  rouletteForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  compressingImages = signal<Set<string>>(new Set());
  isEditMode = signal(false);
  private rouletteId: string | null = null;
  private previewUrls = new Map<FormGroup, string>();

  // Toast notification
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error' | 'warning'>('success');

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
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.rouletteId = params.get('id');
          if (this.rouletteId) {
            this.isEditMode.set(true);
            this.loading.set(true);
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
          }
        },
        error: (err) => {
          this.error.set('Failed to load roulette data.');
          this.loading.set(false);
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

    // Clear existing questions
    while (this.questions.length !== 0) {
      this.questions.removeAt(0);
    }

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
  }

  get questions() {
    return this.rouletteForm.get('questions') as FormArray;
  }

  getQuestionsByValue(value: number): FormGroup[] {
    return this.questions.controls.filter(control =>
      control.get('value')?.value === value
    ) as FormGroup[];
  }

  getQuestionIndex(questionGroup: FormGroup): number {
    return this.questions.controls.indexOf(questionGroup);
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
  }

  getPreviewUrl(questionIndex: number): string | null {
    const questionGroup = this.questions.at(questionIndex) as FormGroup;
    return this.previewUrls.get(questionGroup) || null;
  }

  isImageCompressing(questionIndex: number): boolean {
    const imageId = `question-${questionIndex}`;
    return this.compressingImages().has(imageId);
  }

  generateRouletteWithAI() {
    this.modalService.openInput({
      title: 'Generar Ruleta con IA',
      message: 'Ingresa el tema para generar una ruleta automáticamente:'
    }).then((topic) => {
      if (topic && topic.trim()) {
        this.loading.set(true);
        this.error.set(null);

        this.rouletteService.generateRouletteWithAI(topic.trim()).subscribe({
          next: (aiResponse) => {
            // Update form title
            this.rouletteForm.patchValue({
              title: aiResponse.title
            });

            // Clear existing questions
            while (this.questions.length !== 0) {
              this.questions.removeAt(0);
            }

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

            this.loading.set(false);
          },
          error: (err) => {
            console.error('Error generating roulette with AI:', err);
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

  goBackToDashboard() {
    this.router.navigateByUrl('/dashboard');
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

  onSaveAttempt(event?: Event) {
    if (!this.rouletteForm.valid) {
      event?.preventDefault();
      this.showToastNotification('Revise el formulario', 'warning');
      return false;
    }
    return true;
  }

  onSaveClick() {
    if (this.loading()) {
      return;
    }
    
    if (!this.rouletteForm.valid) {
      this.showToastNotification('⚠️ Por favor, complete todos los campos requeridos', 'warning');
      this.rouletteForm.markAllAsTouched();
      return;
    }
    
    this.onSubmit();
  }
}
