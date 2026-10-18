import { signal } from '@angular/core';

/** Selection + review-overlay state shared by the quiz editors. `total` is read lazily so it follows the form. */
export class QuizEditorState {
  readonly selected = signal(0);
  readonly reviewOpen = signal(false);

  constructor(private readonly total: () => number) {}

  select(index: number): void {
    const last = this.total() - 1;
    this.selected.set(last < 0 ? 0 : Math.min(Math.max(index, 0), last));
  }

  next(): void {
    this.select(this.selected() + 1);
  }

  prev(): void {
    this.select(this.selected() - 1);
  }

  /** Call after the array shrank; `index` is the removed position. */
  afterRemove(index: number): void {
    this.select(index);
  }

  openReview(): void {
    this.reviewOpen.set(true);
  }

  closeReview(): void {
    this.reviewOpen.set(false);
  }

  /** Review card tapped: close the overlay and jump to the question. */
  pick(index: number): void {
    this.closeReview();
    this.select(index);
  }
}
