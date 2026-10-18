import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { QuizIconComponent } from './quiz-icon.component';
import { QuizStatusDotComponent } from './quiz-status-dot.component';
import { QuestionStatus } from './quiz-editor.utils';

/** Header of the editor panel: current item label + duplicate / move / delete actions. */
@Component({
  selector: 'app-quiz-question-toolbar',
  standalone: true,
  imports: [QuizIconComponent, QuizStatusDotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex items-center justify-between gap-2' },
  template: `
    <div class="flex items-center gap-2 min-w-0">
      <span class="font-bold text-lg truncate">{{ label() }}</span>
      <app-quiz-status-dot [status]="status()" />
      @if (badge()) {
        <span class="px-1.5 rounded text-xs font-bold leading-5 text-white" [class]="badgeClass() || 'bg-gray-500'">{{ badge() }}</span>
      }
    </div>
    <div class="flex items-center gap-0.5">
      @if (allowDuplicate()) {
        <button type="button" (click)="duplicate.emit()" [disabled]="!canDuplicate()" aria-label="Duplicar pregunta" [class]="btn + neutral">
          <app-quiz-icon name="copy" class="w-5 h-5" />
        </button>
      }
      @if (allowMove()) {
        <button type="button" (click)="moveUp.emit()" [disabled]="index() <= 0" aria-label="Mover arriba" [class]="btn + neutral">
          <app-quiz-icon name="up" class="w-5 h-5" />
        </button>
        <button type="button" (click)="moveDown.emit()" [disabled]="index() >= total() - 1" aria-label="Mover abajo" [class]="btn + neutral">
          <app-quiz-icon name="down" class="w-5 h-5" />
        </button>
      }
      @if (allowDelete()) {
        <button
          type="button"
          (click)="remove.emit()"
          [disabled]="!canDelete()"
          aria-label="Eliminar pregunta"
          [class]="btn + danger"
        >
          <app-quiz-icon name="trash" class="w-5 h-5" />
        </button>
      }
    </div>
  `,
})
export class QuizQuestionToolbarComponent {
  label = input.required<string>();
  status = input.required<QuestionStatus>();
  badge = input<string | undefined>(undefined);
  badgeClass = input<string | undefined>(undefined);

  index = input(0);
  total = input(0);

  allowDuplicate = input(true);
  allowMove = input(true);
  allowDelete = input(true);
  canDuplicate = input(true);
  canDelete = input(true);

  duplicate = output<void>();
  moveUp = output<void>();
  moveDown = output<void>();
  remove = output<void>();

  protected readonly neutral = ' text-gray-600 dark:text-gray-300';
  protected readonly danger = ' text-red-600 dark:text-red-400';
  protected readonly btn =
    'inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';
}
