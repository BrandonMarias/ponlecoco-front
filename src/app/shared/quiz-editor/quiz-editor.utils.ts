import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

export type QuestionStatus = 'complete' | 'incomplete';

/** Item shown in the question navigator (rail on desktop, chip strip on mobile). */
export interface NavItem {
  label: string;
  status: QuestionStatus;
  hasImage: boolean;
  /** Small pill, e.g. the point value. */
  badge?: string;
  badgeClass?: string;
  /** Items sharing the same group get a header on desktop. */
  group?: string;
}

/** Card shown in the review overlay. */
export interface ReviewCard {
  key: number | string;
  number: string;
  question: string;
  answers: { text: string; correct?: boolean }[];
  imageUrl: string | null;
  complete: boolean;
  missing: string[];
  badge?: string;
  badgeClass?: string;
  group?: string;
  groupIncomplete?: boolean;
}

/** A question is complete exactly when its form group is valid (same rule used to enable saving). */
export function questionStatus(control: AbstractControl | null | undefined): QuestionStatus {
  return control && control.valid ? 'complete' : 'incomplete';
}

/**
 * Labels of the invalid fields of a question group, in form order.
 * `labels` maps control keys to Spanish names; keys without a label are ignored.
 * For FormArray fields the 1-based positions of the invalid entries are appended ("Opción 2, 4").
 */
export function missingFields(group: AbstractControl | null | undefined, labels: Record<string, string>): string[] {
  if (!(group instanceof FormGroup)) {
    return [];
  }
  const missing: string[] = [];
  for (const [key, control] of Object.entries(group.controls)) {
    const label = labels[key];
    if (!control.invalid || !label) {
      continue;
    }
    if (control instanceof FormArray) {
      const positions = control.controls.flatMap((c, i) => (c.invalid ? [i + 1] : []));
      missing.push(positions.length ? `${label} ${positions.join(', ')}` : label);
    } else {
      missing.push(label);
    }
  }
  return missing;
}

export function incompleteCount(controls: readonly AbstractControl[]): number {
  return controls.filter((c) => questionStatus(c) === 'incomplete').length;
}

/** Index of the first incomplete control, or -1. */
export function firstIncompleteIndex(controls: readonly AbstractControl[]): number {
  return controls.findIndex((c) => questionStatus(c) === 'incomplete');
}

/** Moves the item one step (`-1` up, `1` down). Returns the item's new index (unchanged when it can't move). */
export function moveItem(array: FormArray, index: number, delta: -1 | 1): number {
  const target = index + delta;
  if (index < 0 || index >= array.length || target < 0 || target >= array.length) {
    return index;
  }
  const control = array.at(index);
  array.removeAt(index, { emitEvent: false });
  array.insert(target, control);
  array.markAsDirty();
  return target;
}

/** Inserts right after `index`. Returns the index of the inserted control. */
export function insertAfter(array: FormArray, index: number, control: AbstractControl): number {
  const target = Math.min(Math.max(index + 1, 0), array.length);
  array.insert(target, control);
  array.markAsDirty();
  return target;
}

/** Removes the item. Returns the index that should be selected afterwards (-1 when the array is empty). */
export function removeItem(array: FormArray, index: number): number {
  if (index < 0 || index >= array.length) {
    return Math.min(index, array.length - 1);
  }
  array.removeAt(index);
  array.markAsDirty();
  return Math.min(index, array.length - 1);
}

export function truncate(text: string | null | undefined, max: number): string {
  const value = (text ?? '').trim();
  return value.length > max ? value.slice(0, max - 1).trimEnd() + '…' : value;
}
