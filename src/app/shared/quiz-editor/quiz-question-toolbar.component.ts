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
      @if (status() === 'complete') {
        <app-quiz-status-dot status="complete" />
      }
      @if (badge()) {
        <span class="qe-pill" [class]="badgeClass() || 'bg-gray-500'">{{ badge() }}</span>
      }
    </div>
    <div class="flex items-center gap-0.5 p-0.5 rounded-full bg-gray-100 dark:bg-white/5">
      @if (allowDuplicate()) {
        <button type="button" (click)="duplicate.emit()" [disabled]="!canDuplicate()" aria-label="Duplicar pregunta" class="qe-icon-btn">
          <app-quiz-icon name="copy" class="w-5 h-5" />
        </button>
      }
      @if (allowMove()) {
        <button type="button" (click)="moveUp.emit()" [disabled]="index() <= 0" aria-label="Mover arriba" class="qe-icon-btn">
          <app-quiz-icon name="up" class="w-5 h-5" />
        </button>
        <button type="button" (click)="moveDown.emit()" [disabled]="index() >= total() - 1" aria-label="Mover abajo" class="qe-icon-btn">
          <app-quiz-icon name="down" class="w-5 h-5" />
        </button>
      }
      @if (allowDelete()) {
        <button
          type="button"
          (click)="remove.emit()"
          [disabled]="!canDelete()"
          aria-label="Eliminar pregunta"
          class="qe-icon-btn enabled:hover:bg-red-100 enabled:hover:text-red-600 enabled:focus-visible:text-red-600 dark:enabled:hover:bg-red-500/15 dark:enabled:hover:text-red-400 dark:enabled:focus-visible:text-red-400"
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
}
