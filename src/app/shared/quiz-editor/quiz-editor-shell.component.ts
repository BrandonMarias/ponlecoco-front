import { ChangeDetectionStrategy, Component, ElementRef, OnInit, effect, input, output, signal, untracked, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BackButtonComponent } from '../back-button/back-button.component';
import { AiUsageBadgeComponent } from '../ai-usage-badge/ai-usage-badge.component';
import { QuizIconComponent } from './quiz-icon.component';

const INSTRUCTIONS_STORAGE_PREFIX = 'quiz-editor-instructions:';

/**
 * Editor chrome shared by the quiz creators: compact top bar (back, title, AI, help, review, save),
 * a navigator slot, the editor panel (scrolls internally) and a prev/next pager.
 * Fits the viewport; the page itself never scrolls.
 *
 * Slots: `[navigator]` (rail on desktop / strip on mobile, or a top row when `rail` is false) and the default slot (panel).
 */
@Component({
  selector: 'app-quiz-editor-shell',
  standalone: true,
  imports: [ReactiveFormsModule, BackButtonComponent, AiUsageBadgeComponent, QuizIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'onKeydown($event)',
  },
  template: `
    <div class="content-page flex flex-col h-dvh overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white">
      <!-- Top bar -->
      <header class="relative z-20 flex-none bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-2 py-1.5">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 max-w-screen-2xl mx-auto">
          <app-back-button [compact]="true" [intercept]="true" label="Volver" (pressed)="back.emit()" />

          @if (logo()) {
            <img [src]="logo()" alt="" class="hidden sm:block w-8 h-8 shrink-0" />
          }

          <input
            #titleInput
            type="text"
            [formControl]="titleControl()"
            [placeholder]="titlePlaceholder()"
            aria-label="Título"
            [attr.aria-invalid]="titleControl().invalid && titleControl().touched ? 'true' : null"
            class="flex-1 min-w-0 h-10 px-3 text-base font-semibold bg-transparent border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-indigo-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 truncate"
            [class.ring-2]="titleControl().invalid && titleControl().touched"
            [class.ring-red-500]="titleControl().invalid && titleControl().touched"
          />

          <!-- Tools: second row on mobile, inline on md+ -->
          <div class="order-last w-full flex items-center gap-1 md:order-none md:w-auto">
            @if (showAi()) {
              <button
                type="button"
                (click)="ai.emit()"
                [disabled]="aiDisabled()"
                [attr.aria-label]="aiLabel()"
                class="inline-flex items-center justify-center w-10 h-10 rounded-full text-white bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
              >
                <app-quiz-icon name="ai" class="w-5 h-5" />
              </button>
              <app-ai-usage-badge class="mr-1" />
            }

            <div class="relative">
              <button
                type="button"
                (click)="toggleInstructions()"
                aria-label="Ayuda"
                [attr.aria-expanded]="instructionsOpen()"
                class="inline-flex items-center justify-center w-10 h-10 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                [class.bg-indigo-100]="instructionsOpen()"
                [class.dark:bg-indigo-900]="instructionsOpen()"
              >
                <app-quiz-icon name="help" class="w-5 h-5" />
              </button>
            </div>

            <button
              type="button"
              (click)="review.emit()"
              aria-label="Revisar preguntas"
              class="inline-flex items-center justify-center gap-1 h-10 px-3 rounded-full text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <app-quiz-icon name="eye" class="w-5 h-5" />
              <span>Revisar</span>
            </button>

            @if (incompleteCount() > 0) {
              <button
                type="button"
                (click)="jumpIncomplete.emit()"
                [attr.aria-label]="incompleteCount() + ' sin completar. Ir a la primera'"
                class="ml-auto md:ml-1 inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <app-quiz-icon name="alert" class="w-4 h-4" />
                {{ incompleteCount() }} sin completar
              </button>
            }
          </div>

          <button
            type="button"
            (click)="save.emit()"
            [disabled]="saving()"
            [attr.aria-disabled]="invalid() || saving()"
            [attr.aria-label]="saveLabel()"
            class="inline-flex items-center justify-center gap-2 h-10 px-3 sm:px-4 rounded-full font-semibold text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
            [class]="invalid() || saving() ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'"
          >
            @if (saving()) {
              <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            } @else {
              <app-quiz-icon name="check" class="w-5 h-5" />
            }
            <span class="hidden sm:inline">{{ saving() ? 'Guardando...' : 'Guardar' }}</span>
          </button>
        </div>

        @if (instructionsOpen()) {
          <!-- Click-away layer + popover -->
          <button type="button" class="fixed inset-0 z-10 cursor-default" aria-label="Cerrar ayuda" tabindex="-1" (click)="closeInstructions()"></button>
          <div
            role="region"
            aria-label="Instrucciones"
            class="absolute z-20 left-2 right-2 top-full mt-1 md:left-auto md:right-2 md:w-96 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-xl shadow-xl p-3"
          >
            <ul class="space-y-1.5 text-sm text-gray-700 dark:text-gray-200">
              @for (line of instructions(); track $index) {
                <li class="flex gap-2">
                  <span class="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                  <span>{{ line }}</span>
                </li>
              }
            </ul>
          </div>
        }
      </header>

      @if (error()) {
        <div role="alert" class="flex-none px-3 py-2 text-sm text-red-800 bg-red-100 dark:bg-red-900 dark:text-red-300">
          {{ error() }}
        </div>
      }

      <!-- Navigator + editor panel -->
      <div class="flex-1 min-h-0 flex flex-col" [class.md:flex-row]="rail()">
        <ng-content select="[navigator]" />

        <main class="flex-1 min-h-0 min-w-0 flex flex-col">
          <div #panel class="flex-1 min-h-0 overflow-y-auto">
            <ng-content />
          </div>

          @if (total() > 0) {
            <nav
              aria-label="Cambiar de pregunta"
              class="flex-none flex items-center justify-between gap-2 px-3 py-1.5 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
              style="padding-bottom: max(0.375rem, env(safe-area-inset-bottom))"
            >
              <button
                type="button"
                (click)="prev.emit()"
                [disabled]="current() <= 0"
                aria-label="Pregunta anterior"
                class="inline-flex items-center justify-center w-12 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <app-quiz-icon name="chevron-left" class="w-5 h-5" />
              </button>
              <span class="text-sm font-semibold tabular-nums text-gray-600 dark:text-gray-300" aria-live="polite">
                {{ current() + 1 }} / {{ total() }}
              </span>
              <button
                type="button"
                (click)="next.emit()"
                [disabled]="current() >= total() - 1"
                aria-label="Pregunta siguiente"
                class="inline-flex items-center justify-center w-12 h-10 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                <app-quiz-icon name="chevron-right" class="w-5 h-5" />
              </button>
            </nav>
          }
        </main>
      </div>
    </div>
  `,
})
export class QuizEditorShellComponent implements OnInit {
  titleControl = input.required<FormControl>();
  titlePlaceholder = input('Título');
  logo = input<string | null>(null);

  /** localStorage key suffix + bullets for the "?" popover. */
  instructionsKey = input.required<string>();
  instructions = input<string[]>([]);

  showAi = input(true);
  aiDisabled = input(false);
  aiLabel = input('Generar con IA');

  saving = input(false);
  /** Visual "can't save yet" state. The button stays clickable so the screen can jump to the first incomplete item. */
  invalid = input(false);
  saveLabel = input('Guardar');
  incompleteCount = input(0);
  error = input<string | null>(null);

  /** Position inside the navigable sequence, drives the pager. */
  current = input(0);
  total = input(0);
  /** Changing this value scrolls the panel back to the top (pass the selected question). */
  scrollKey = input<unknown>(null);
  /** Navigator as a left rail on md+ (default) or as a top row at every size. */
  rail = input(true);

  back = output<void>();
  save = output<void>();
  ai = output<void>();
  review = output<void>();
  prev = output<void>();
  next = output<void>();
  jumpIncomplete = output<void>();

  instructionsOpen = signal(false);

  private titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');
  private panel = viewChild<ElementRef<HTMLElement>>('panel');

  constructor() {
    // The panel scrolls internally on small screens; start each question at the top.
    effect(() => {
      this.scrollKey();
      untracked(() => this.panel()?.nativeElement.scrollTo({ top: 0 }));
    });
  }

  ngOnInit(): void {
    this.restoreInstructionsState();
  }

  focusTitle(): void {
    this.titleInput()?.nativeElement.focus();
  }

  toggleInstructions(): void {
    this.setInstructions(!this.instructionsOpen());
  }

  closeInstructions(): void {
    this.setInstructions(false);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.instructionsOpen()) {
      this.closeInstructions();
      return;
    }
    if (event.altKey && !event.ctrlKey && !event.metaKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      // Alt+Arrow is "browser back/forward" on desktop; the editor takes it over.
      event.preventDefault();
      (event.key === 'ArrowLeft' ? this.prev : this.next).emit();
    }
  }

  /** Open by default only the very first visit; afterwards restore what the user left. */
  private restoreInstructionsState(): void {
    const key = INSTRUCTIONS_STORAGE_PREFIX + this.instructionsKey();
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(key);
    } catch {
      return;
    }
    if (stored === null) {
      this.instructionsOpen.set(true);
      this.persistInstructions(false);
    } else {
      this.instructionsOpen.set(stored === 'open');
    }
  }

  private setInstructions(open: boolean): void {
    this.instructionsOpen.set(open);
    this.persistInstructions(open);
  }

  private persistInstructions(open: boolean): void {
    try {
      localStorage.setItem(INSTRUCTIONS_STORAGE_PREFIX + this.instructionsKey(), open ? 'open' : 'closed');
    } catch {
      // storage unavailable (private mode): state just isn't remembered
    }
  }
}
