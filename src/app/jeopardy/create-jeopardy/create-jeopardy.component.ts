import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { JeopardyService } from '../jeopardy.service';
import { finalize, switchMap, of, Observable, forkJoin, map, tap } from 'rxjs';
import { Jeopardy } from '../jeopardy';
import { AiService } from '../../shared/ai.service';
import { ModalService } from '../../shared/modal.service';
import { AiCategoryResponse } from '../../shared/ai.interface';
import { ImageCompressionService } from '../../shared/image-compression.service';

@Component({
  selector: 'app-create-jeopardy',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-jeopardy.component.html',
})
export default class CreateJeopardyComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private jeopardyService = inject(JeopardyService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private aiService = inject(AiService);
  private modalService = inject(ModalService);
  private imageCompressionService = inject(ImageCompressionService);

  jeopardyForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  compressingImages = signal<Set<string>>(new Set());
  isEditMode = signal(false);
  private jeopardyId: string | null = null;
  private previewUrls = new Map<FormGroup, string>();

  constructor() {
    this.jeopardyForm = this.fb.group({
      title: ['', Validators.required],
      categories: this.fb.array(
        [],
        [Validators.required, Validators.minLength(1)]
      ),
    });
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.jeopardyId = params.get('id');
          if (this.jeopardyId) {
            this.isEditMode.set(true);
            this.loading.set(true);
            return this.jeopardyService.getJeopardyById(this.jeopardyId);
          }
          return of(null);
        })
      )
      .subscribe({
        next: (jeopardy) => {
          if (jeopardy) {
            this.patchForm(jeopardy);
            this.loading.set(false);
          }
        },
        error: (err) => {
          this.error.set('Failed to load jeopardy data.');
          this.loading.set(false);
          console.error(err);
        },
      });
  }

  ngOnDestroy(): void {
    this.previewUrls.forEach(url => URL.revokeObjectURL(url));
  }

  patchForm(jeopardy: Jeopardy) {
    this.jeopardyForm.patchValue({
      title: jeopardy.title,
    });

    jeopardy.categories.forEach((cat) => {
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
  }

  get categories() {
    return this.jeopardyForm.get('categories') as FormArray;
  }

  addCategory() {
    if (this.categories.length >= 6) return;

    const categoryGroup = this.fb.group({
      title: ['', Validators.required],
      questions: this.fb.array(this.createFiveQuestions()),
      doublePointsQuestion: [null],
    });
    this.categories.push(categoryGroup);
  }

  async addCategoryWithIA() {
    const topic = await this.modalService.openInput({
      title: 'Generar Categoría con IA',
      message: 'Introduce el tema para generar la categoría y las preguntas.',
    });

    if (topic) {
      this.loading.set(true);
      this.aiService
        .generateCategory(topic)
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (response) => {
            this.addCategoryFromIA(response);
          },
          error: (err) => {
            this.error.set(err.error.message || 'An unexpected error occurred.');
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
  }

  removeCategory(index: number) {
    this.questions(index).controls.forEach(questionControl => {
      const questionGroup = questionControl as FormGroup;
      if (this.previewUrls.has(questionGroup)) {
        URL.revokeObjectURL(this.previewUrls.get(questionGroup)!);
        this.previewUrls.delete(questionGroup);
      }
    });
    this.categories.removeAt(index);
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

  toggleDoublePoints(categoryIndex: number, questionIndex: string) {
    const category = this.categories.at(categoryIndex) as FormGroup;
    const doublePointsControl = category.get('doublePointsQuestion');

    if (doublePointsControl?.value === questionIndex) {
      doublePointsControl.setValue(null);
    } else {
      doublePointsControl?.setValue(questionIndex);
    }
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
  }

  getPreviewUrl(catIndex: number, qIndex: number): string | null {
    const questionGroup = this.questions(catIndex).at(qIndex) as FormGroup;
    return this.previewUrls.get(questionGroup) || null;
  }

  isImageCompressing(catIndex: number, qIndex: number): boolean {
    const imageId = `${catIndex}-${qIndex}`;
    return this.compressingImages().has(imageId);
  }

  onSubmit() {
    this.jeopardyForm.markAllAsTouched();
    if (this.jeopardyForm.invalid) {
      this.error.set('Por favor, completa todos los campos requeridos.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.uploadImages().pipe(
      switchMap(() => this.saveJeopardy())
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
      this.jeopardyService.uploadQuestionImage(task.imageFile)
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

  private saveJeopardy(): Observable<Jeopardy> {
    const formValue = this.jeopardyForm.getRawValue();

    const jeopardyData = {
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

    const saveObservable: Observable<Jeopardy> = this.isEditMode()
      ? this.jeopardyService.updateJeopardy(this.jeopardyId!, jeopardyData)
      : this.jeopardyService.createJeopardy(jeopardyData);

    return saveObservable;
  }
}
