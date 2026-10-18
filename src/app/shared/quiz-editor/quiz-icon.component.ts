import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const STROKE_ICONS = {
  back: 'M15 19l-7-7 7-7',
  'chevron-left': 'M15 19l-7-7 7-7',
  'chevron-right': 'M9 5l7 7-7 7',
  plus: 'M12 4v16m8-8H4',
  x: 'M6 18L18 6M6 6l12 12',
  check: 'M5 13l4 4L19 7',
  exclaim: 'M12 7v6m0 4h.01',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  ai: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  help: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  up: 'M5 10l7-7m0 0l7 7m-7-7v18',
  down: 'M19 14l-7 7m0 0l-7-7m7 7V3',
  image: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  alert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
  camera: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z',
} as const;

const FILLED_ICONS = {
  triangle: 'M12 3L2 21h20L12 3z',
  diamond: 'M12 2l10 10-10 10L2 12 12 2z',
  circle: 'M12 2a10 10 0 100 20 10 10 0 000-20z',
  square: 'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z',
} as const;

export type QuizIconName = keyof typeof STROKE_ICONS | keyof typeof FILLED_ICONS;

/** Inline SVG icon (Heroicons-outline style used across the app). Size it with width/height classes on the host. */
@Component({
  selector: 'app-quiz-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block shrink-0', 'aria-hidden': 'true' },
  template: `
    @if (filled()) {
      <svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path [attr.d]="path()"></path></svg>
    } @else {
      <svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="path()"></path>
      </svg>
    }
  `,
})
export class QuizIconComponent {
  name = input.required<QuizIconName>();

  filled = computed(() => this.name() in FILLED_ICONS);
  path = computed(() => {
    const name = this.name();
    return name in FILLED_ICONS
      ? FILLED_ICONS[name as keyof typeof FILLED_ICONS]
      : STROKE_ICONS[name as keyof typeof STROKE_ICONS];
  });
}
