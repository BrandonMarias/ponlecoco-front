import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, output, untracked } from '@angular/core';
import { QuizIconComponent } from './quiz-icon.component';
import { QuizStatusDotComponent } from './quiz-status-dot.component';
import { NavItem } from './quiz-editor.utils';

/**
 * Question navigator. Desktop (md+): vertical rail of cards. Mobile: horizontal strip of numbered chips.
 * The selected item is kept in view. The "+" button is the last element in both layouts.
 */
@Component({
  selector: 'app-quiz-navigator',
  standalone: true,
  imports: [QuizIconComponent, QuizStatusDotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block flex-none md:w-60 md:min-h-0' },
  template: `
    <nav
      aria-label="Preguntas"
      class="h-full flex items-center md:items-stretch md:flex-col gap-2 p-2 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto bg-white dark:bg-gray-800 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 [scrollbar-width:thin]"
    >
      @for (item of items(); track $index; let i = $index) {
        @if (item.group && item.group !== items()[i - 1]?.group) {
          <div class="hidden md:block px-1 pt-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {{ item.group }}
          </div>
        }
        <button
          type="button"
          [attr.data-idx]="i"
          (click)="select.emit(i)"
          [attr.aria-current]="i === selected() ? 'true' : null"
          [attr.aria-label]="'Pregunta ' + (i + 1) + (item.badge ? ', ' + item.badge : '') + (item.status === 'incomplete' ? ', sin completar' : '')"
          class="relative shrink-0 min-w-11 h-12 md:h-auto md:min-h-14 md:w-full px-2 md:px-3 md:py-2 flex flex-col md:flex-row items-center justify-center md:justify-start gap-0 md:gap-2 rounded-lg border-2 text-left transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          [class]="
            i === selected()
              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100'
              : item.status === 'incomplete'
                ? 'border-amber-400 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:border-indigo-300'
          "
        >
          <span class="text-sm font-bold leading-none md:w-6 md:text-center">{{ i + 1 }}</span>
          @if (item.badge) {
            <span
              class="mt-0.5 md:mt-0 md:order-last px-1 rounded text-[10px] md:text-xs font-bold leading-4 text-white"
              [class]="item.badgeClass ?? 'bg-gray-500'"
              >{{ item.badge }}</span
            >
          }
          <span class="hidden md:block flex-1 min-w-0 text-sm line-clamp-2 break-words">
            @if (item.label) {
              {{ item.label }}
            } @else {
              <span class="italic text-gray-400 dark:text-gray-500">Sin texto</span>
            }
          </span>
          @if (item.hasImage) {
            <app-quiz-icon
              name="image"
              class="absolute -bottom-1 -left-1 w-4 h-4 p-px rounded bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300 md:static md:p-0 md:bg-transparent md:dark:bg-transparent md:order-last"
            />
          }
          <app-quiz-status-dot [status]="item.status" class="absolute -top-1.5 -right-1.5 md:static md:order-last" />
        </button>
      }

      @if (showAdd()) {
        <div class="shrink-0 md:sticky md:bottom-0 md:pt-1 md:bg-white md:dark:bg-gray-800">
          <button
            type="button"
            (click)="add.emit()"
            [disabled]="!canAdd()"
            aria-label="Agregar"
            class="min-w-11 h-12 md:w-full md:h-12 px-3 inline-flex items-center justify-center gap-2 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed shadow-sm touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <app-quiz-icon name="plus" class="w-6 h-6" />
            @if (counter()) {
              <span class="hidden md:inline text-sm tabular-nums">{{ counter() }}</span>
            }
          </button>
        </div>
      }
    </nav>
  `,
})
export class QuizNavigatorComponent {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  items = input.required<NavItem[]>();
  selected = input(0);
  showAdd = input(true);
  canAdd = input(true);
  /** e.g. "3/30", shown next to "+" on desktop. */
  counter = input('');

  select = output<number>();
  add = output<void>();

  constructor() {
    effect(() => {
      const index = this.selected();
      this.items();
      untracked(() =>
        setTimeout(() =>
          this.host.nativeElement
            .querySelector<HTMLElement>(`[data-idx="${index}"]`)
            ?.scrollIntoView({ block: 'nearest', inline: 'nearest' }),
        ),
      );
    });
  }
}
