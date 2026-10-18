import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { QuizIconComponent } from './quiz-icon.component';
import { QuestionStatus } from './quiz-editor.utils';

/** Inline status icon: complete (emerald check) / incomplete (amber alert). Always an icon, never colour alone. */
@Component({
  selector: 'app-quiz-status-dot',
  standalone: true,
  imports: [QuizIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'img',
    class: 'inline-flex items-center justify-center w-4 h-4 shrink-0',
    '[class]': 'tone()',
    '[attr.aria-label]': "status() === 'complete' ? 'Completa' : 'Sin completar'",
  },
  template: `<app-quiz-icon [name]="status() === 'complete' ? 'check' : 'alert'" class="w-full h-full" />`,
})
export class QuizStatusDotComponent {
  status = input.required<QuestionStatus>();
  /** Set when sitting on a filled/dark background (selected chip, board tile) so the icon stays readable. */
  onDark = input(false);

  protected tone = computed(() => {
    const complete = this.status() === 'complete';
    if (this.onDark()) {
      return complete ? 'text-emerald-300' : 'text-amber-300';
    }
    return complete ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400';
  });
}
