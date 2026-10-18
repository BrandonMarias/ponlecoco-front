import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, input, output, viewChild } from '@angular/core';
import { QuizIconComponent } from './quiz-icon.component';
import { QuizStatusDotComponent } from './quiz-status-dot.component';
import { ReviewCard } from './quiz-editor.utils';

/** Full-screen grid with every question. Tap a card to jump to it. Dismiss with X, Esc or the backdrop. */
@Component({
  selector: 'app-quiz-review-overlay',
  standalone: true,
  imports: [QuizIconComponent, QuizStatusDotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="fixed inset-0 z-30 flex items-end md:items-center justify-center">
      <button type="button" class="absolute inset-0 bg-black/60 cursor-default" aria-label="Cerrar revisión" tabindex="-1" (click)="closed.emit()"></button>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Revisar preguntas"
        class="relative w-full h-[calc(100dvh-2rem)] md:h-[calc(100dvh-4rem)] md:max-w-5xl flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden dark:border dark:border-white/10"
      >
        <header class="qe-surface flex-none flex items-center justify-between gap-2 px-3 py-2 border-b">
          <div class="flex items-center gap-2 font-bold">
            <app-quiz-icon name="eye" class="w-5 h-5" />
            <span class="tabular-nums">{{ cards().length }}</span>
            @if (incomplete() > 0) {
              <span class="inline-flex items-center gap-1 px-2 h-7 rounded-full text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-500/10 border border-amber-300/70 dark:border-amber-500/40">
                <app-quiz-icon name="alert" class="w-4 h-4" />
                {{ incomplete() }} sin completar
              </span>
            }
          </div>
          <button
            #closeBtn
            type="button"
            (click)="closed.emit()"
            aria-label="Cerrar"
            class="qe-icon-btn"
          >
            <app-quiz-icon name="x" class="w-6 h-6" />
          </button>
        </header>

        <div class="flex-1 min-h-0 overflow-y-auto p-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            @for (card of cards(); track card.key; let i = $index) {
              @if (card.group !== undefined && card.group !== cards()[i - 1]?.group) {
                <h3 class="col-span-full flex items-center gap-2 pt-1 text-sm font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  @if (card.group) {
                    {{ card.group }}
                  } @else {
                    <span class="italic normal-case font-medium text-gray-400">Sin título</span>
                  }
                  @if (card.groupIncomplete) {
                    <app-quiz-status-dot status="incomplete" />
                  }
                </h3>
              }
              <button
                type="button"
                (click)="select.emit(card.key)"
                [attr.aria-label]="'Ir a la pregunta ' + card.number + (card.complete ? '' : ', sin completar')"
                class="text-left flex flex-col gap-2 p-3 rounded-2xl border shadow-sm transition duration-150 motion-reduce:transition-none hover:shadow-md qe-ring touch-manipulation"
                [class]="
                  card.complete
                    ? 'border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 hover:border-indigo-400'
                    : 'border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 hover:border-amber-500'
                "
              >
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-100 text-sm font-bold tabular-nums">{{ card.number }}</span>
                  @if (card.badge) {
                    <span class="qe-pill" [class]="card.badgeClass ?? 'bg-gray-500'">{{ card.badge }}</span>
                  }
                  <app-quiz-status-dot [status]="card.complete ? 'complete' : 'incomplete'" class="ml-auto !w-5 !h-5" />
                </div>

                <div class="flex gap-2">
                  <p class="flex-1 min-w-0 text-sm font-semibold line-clamp-2 break-words">
                    @if (card.question) {
                      {{ card.question }}
                    } @else {
                      <span class="italic font-normal text-gray-400 dark:text-gray-500">Sin texto</span>
                    }
                  </p>
                  @if (card.imageUrl) {
                    <img [src]="card.imageUrl" alt="" width="48" height="48" loading="lazy" decoding="async" class="w-12 h-12 shrink-0 rounded-lg object-cover" />
                  }
                </div>

                @if (card.answers.length) {
                  <ul class="space-y-0.5">
                    @for (answer of card.answers; track $index) {
                      <li
                        class="flex items-center gap-1.5 text-xs"
                        [class]="answer.correct ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'"
                      >
                        @if (answer.correct) {
                          <app-quiz-icon name="check" class="w-3.5 h-3.5" />
                        } @else {
                          <span class="w-3.5 shrink-0"></span>
                        }
                        <span class="truncate">
                          @if (answer.text) {
                            {{ answer.text }}
                          } @else {
                            <span class="italic">—</span>
                          }
                        </span>
                      </li>
                    }
                  </ul>
                }

                @if (!card.complete) {
                  <p class="flex items-center gap-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                    <app-quiz-icon name="alert" class="w-4 h-4" />
                    <span class="truncate">{{ card.missing.join(' · ') }}</span>
                  </p>
                }
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class QuizReviewOverlayComponent implements AfterViewInit {
  cards = input.required<ReviewCard[]>();
  /** Number of incomplete cards (shown in the header). */
  incomplete = input(0);

  select = output<number | string>();
  closed = output<void>();

  private closeBtn = viewChild<ElementRef<HTMLButtonElement>>('closeBtn');

  ngAfterViewInit(): void {
    this.closeBtn()?.nativeElement.focus();
  }
}
