import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { QuizIconComponent } from './quiz-icon.component';

/** Toast used by the quiz editors (same look as the inline toasts these screens had). */
@Component({
  selector: 'app-quiz-toast',
  standalone: true,
  imports: [QuizIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (show()) {
      <div class="fixed bottom-20 inset-x-4 sm:inset-x-auto sm:right-4 z-50 animate-slide-in-up pointer-events-none">
        <div
          role="status"
          class="text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 sm:min-w-[300px]"
          [class]="type() === 'success' ? 'bg-green-500' : type() === 'warning' ? 'bg-yellow-500' : 'bg-red-500'"
        >
          <app-quiz-icon [name]="type() === 'success' ? 'check' : type() === 'warning' ? 'alert' : 'x'" class="w-6 h-6" />
          <span class="font-medium">{{ message() }}</span>
        </div>
      </div>
    }
  `,
})
export class QuizToastComponent {
  show = input(false);
  message = input('');
  type = input<'success' | 'error' | 'warning'>('success');
}
