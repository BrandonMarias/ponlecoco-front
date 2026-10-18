import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { QuizIconComponent } from './quiz-icon.component';
import { QuestionStatus } from './quiz-editor.utils';

/** Complete (green check) / incomplete (amber "!"): colour is always paired with a glyph. */
@Component({
  selector: 'app-quiz-status-dot',
  standalone: true,
  imports: [QuizIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'img',
    class: 'inline-flex items-center justify-center w-4 h-4 rounded-full text-white shrink-0',
    '[class.bg-green-600]': "status() === 'complete'",
    '[class.bg-amber-500]': "status() === 'incomplete'",
    '[attr.aria-label]': "status() === 'complete' ? 'Completa' : 'Sin completar'",
  },
  template: `<app-quiz-icon [name]="status() === 'complete' ? 'check' : 'exclaim'" class="w-3 h-3" />`,
})
export class QuizStatusDotComponent {
  status = input.required<QuestionStatus>();
}
