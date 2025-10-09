import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { JeopardyService } from '../jeopardy.service';
import { finalize, switchMap, of, Observable } from 'rxjs';
import { Jeopardy } from '../jeopardy';
import { AiService } from '../../shared/ai.service';
import { ModalService } from '../../shared/modal.service';
import { AiCategoryResponse } from '../../shared/ai.interface';

@Component({
  selector: 'app-create-jeopardy',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-jeopardy.component.html',
})
export default class CreateJeopardyComponent implements OnInit {
  private fb = inject(FormBuilder);
  private jeopardyService = inject(JeopardyService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private aiService = inject(AiService);
  private modalService = inject(ModalService);

  jeopardyForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  isEditMode = signal(false);
  private jeopardyId: string | null = null;

  constructor() {
    this.jeopardyForm = this.fb.group({
      title: ['', Validators.required],
      categories: this.fb.array([], [Validators.required, Validators.minLength(1)]),
    });
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        this.jeopardyId = params.get('id');
        if (this.jeopardyId) {
          this.isEditMode.set(true);
          this.loading.set(true);
          return this.jeopardyService.getJeopardyById(this.jeopardyId);
        }
        return of(null);
      })
    ).subscribe({
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
      }
    });
  }

  patchForm(jeopardy: Jeopardy) {
    this.jeopardyForm.patchValue({
      title: jeopardy.title,
    });

    jeopardy.categories.forEach(cat => {
      const questionsFGs = cat.questions.map(q => {
        return this.fb.group({
          question: [q.question, Validators.required],
          answer: [q.answer, Validators.required],
          value: [q.value, Validators.required],
        });
      });

      const doublePointsQuestionIndex = cat.questions.findIndex(q => q.doublePoints).toString();

      const categoryGroup = this.fb.group({
        title: [cat.title, Validators.required],
        questions: this.fb.array(questionsFGs),
        doublePointsQuestion: [doublePointsQuestionIndex !== '-1' ? doublePointsQuestionIndex : null]
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
      doublePointsQuestion: [null]
    });
    this.categories.push(categoryGroup);
  }

  async addCategoryWithIA() {
    const topic = await this.modalService.openInput({
      title: 'Generar Categoría con IA',
      message: 'Introduce el tema para generar la categoría y las preguntas.'
    });
  
    if (topic) {
      this.loading.set(true);
      this.aiService.generateCategory(topic).pipe(
        finalize(() => this.loading.set(false))
      ).subscribe({
        next: (response) => {
          this.addCategoryFromIA(response);
        },
        error: (err) => {
          this.error.set(err.error.message || 'An unexpected error occurred.');
        }
      });
    }
  }

  addCategoryFromIA(data: AiCategoryResponse) {
    const randomIndex = Math.floor(Math.random() * 5).toString();
    const categoryGroup = this.fb.group({
      title: [data.category, Validators.required],
      doublePointsQuestion: [randomIndex],
      questions: this.fb.array(
        data.questions.map(q => this.fb.group({
          question: [q.question, Validators.required],
          answer: [q.answer, Validators.required],
          value: [q.value, Validators.required]
        }))
      )
    });
    this.categories.push(categoryGroup);
  }

  removeCategory(index: number) {
    this.categories.removeAt(index);
  }

  createFiveQuestions(): FormGroup[] {
    const values = [100, 200, 300, 400, 500];
    return values.map(value => this.fb.group({
      question: ['', Validators.required],
      answer: ['', Validators.required],
      value: [value, Validators.required],
    }));
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

  onSubmit() {
    this.jeopardyForm.markAllAsTouched();
    if (this.jeopardyForm.invalid) {
      if (this.categories.errors?.['minlength']) {
        this.error.set('Debes añadir al menos una categoría.');
      } else {
        this.error.set('Por favor, completa todos los campos requeridos en el formulario.');
      }
      return;
    }
    this.loading.set(true);
    this.error.set(null);

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

    saveObservable.pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: () => {
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        let errorMessage = 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.';
        if (err.error && err.error.message) {
          if (Array.isArray(err.error.message)) {
            errorMessage = err.error.message.join(', ');
          } else {
            errorMessage = err.error.message;
          }
        }
        this.error.set(errorMessage);
        console.error(err);
      }
    });
  }
}