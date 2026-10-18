import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, output, untracked } from '@angular/core';
import { QuizIconComponent } from './quiz-icon.component';
import { QuizStatusDotComponent } from './quiz-status-dot.component';
import { NavItem, QuestionStatus } from './quiz-editor.utils';

/**
 * Question navigator. Desktop (md+): vertical rail of cards. Mobile: horizontal strip of numbered chips.
 * The selected item is kept in view. The "+" button is the last element in both layouts.
 * Chip look comes from the shared `qe-chip*` classes (src/styles.css).
 */
@Component({
  selector: 'app-quiz-navigator',
  standalone: true,
  imports: [QuizIconComponent, QuizStatusDotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block flex-none md:w-64 md:min-h-0' },
  template: `
    <nav
      aria-label="Preguntas"
      class="qe-surface h-full flex items-center md:items-stretch md:flex-col gap-2 px-3 py-2.5 md:p-3 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto border-b md:border-b-0 md:border-r [scrollbar-width:thin]"
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
          class="qe-chip flex-col md:flex-row md:h-auto md:min-h-14 md:w-full md:px-3 md:py-2 md:justify-start md:text-left gap-0 md:gap-2.5"
          [class.qe-chip-selected]="i === selected()"
          [class.md:scale-100]="i === selected()"
        >
          <span class="flex items-center gap-1 md:contents">
            <span class="text-base font-bold leading-none tabular-nums md:min-w-5 md:text-center">{{ i + 1 }}</span>
            @if (progress(item); as p) {
              <app-quiz-status-dot [status]="p" [onDark]="i === selected()" class="!w-3.5 !h-3.5 md:!w-4 md:!h-4 md:order-last" />
            }
          </span>
          @if (item.badge) {
            <span class="qe-pill mt-0.5 md:mt-0 md:order-last md:ml-auto" [class]="item.badgeClass ?? 'bg-gray-500'">{{ item.badge }}</span>
          }
          <span
            class="hidden md:block flex-1 min-w-0 text-xs leading-snug truncate"
            [class]="i === selected() ? 'text-white/85' : 'text-gray-500 dark:text-gray-400'"
          >
            @if (item.label) {
              {{ item.label }}
            } @else {
              <span class="italic">Sin texto</span>
            }
          </span>
          @if (item.hasImage) {
            <app-quiz-icon name="image" class="hidden md:block w-4 h-4 md:order-last opacity-70" />
          }
        </button>
      }

      @if (showAdd()) {
        <div class="shrink-0 md:sticky md:bottom-0 md:pt-1 md:-mb-1 md:bg-white md:dark:bg-gray-900">
          <button type="button" (click)="add.emit()" [disabled]="!canAdd()" aria-label="Agregar" class="qe-chip-add md:w-full">
            <app-quiz-icon name="plus" class="w-5 h-5" />
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

  /** Untouched items stay neutral (no icon); started-but-incomplete ones get the amber icon. */
  protected progress(item: NavItem): QuestionStatus | null {
    if (item.status === 'complete') {
      return 'complete';
    }
    return item.label || item.hasImage ? 'incomplete' : null;
  }
}
