import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import {
  firstIncompleteIndex,
  incompleteCount,
  insertAfter,
  missingFields,
  moveItem,
  questionStatus,
  removeItem,
  truncate,
} from './quiz-editor.utils';

const LABELS = { question: 'Pregunta', options: 'Opción' };

function quickQuestion(question = '', options = ['', '', '', '']): FormGroup {
  return new FormGroup({
    question: new FormControl(question, Validators.required),
    options: new FormArray(options.map((o) => new FormControl(o, Validators.required))),
    correctAnswerIndex: new FormControl(0, Validators.required),
    imageUrl: new FormControl(null),
  });
}

const complete = (q: string) => quickQuestion(q, ['a', 'b', 'c', 'd']);

function texts(array: FormArray): string[] {
  return array.controls.map((c) => c.get('question')!.value);
}

describe('quiz-editor utils', () => {
  describe('questionStatus / missingFields', () => {
    it('is complete only when every required field is filled', () => {
      expect(questionStatus(complete('Q'))).toBe('complete');
      expect(questionStatus(quickQuestion('Q'))).toBe('incomplete');
      expect(questionStatus(quickQuestion('', ['a', 'b', 'c', 'd']))).toBe('incomplete');
      expect(questionStatus(null)).toBe('incomplete');
    });

    it('lists what is missing, with option positions', () => {
      expect(missingFields(quickQuestion('', ['a', '', 'c', '']), LABELS)).toEqual(['Pregunta', 'Opción 2, 4']);
      expect(missingFields(complete('Q'), LABELS)).toEqual([]);
    });

    it('ignores controls without a label and non-groups', () => {
      const group = new FormGroup({ value: new FormControl('', Validators.required) });
      expect(missingFields(group, LABELS)).toEqual([]);
      expect(missingFields(new FormControl(''), LABELS)).toEqual([]);
    });

    it('counts and locates incomplete questions', () => {
      const list = [complete('A'), quickQuestion('B'), complete('C'), quickQuestion('D')];
      expect(incompleteCount(list)).toBe(2);
      expect(firstIncompleteIndex(list)).toBe(1);
      expect(firstIncompleteIndex([complete('A')])).toBe(-1);
    });
  });

  describe('array operations', () => {
    let array: FormArray;
    beforeEach(() => {
      array = new FormArray([complete('A'), complete('B'), complete('C')]);
    });

    it('moves an item down and up, returning its new index', () => {
      expect(moveItem(array, 0, 1)).toBe(1);
      expect(texts(array)).toEqual(['B', 'A', 'C']);
      expect(moveItem(array, 1, -1)).toBe(0);
      expect(texts(array)).toEqual(['A', 'B', 'C']);
      expect(array.dirty).toBeTrue();
    });

    it('keeps the same control instance when moving (image previews are keyed by group)', () => {
      const first = array.at(0);
      moveItem(array, 0, 1);
      expect(array.at(1)).toBe(first);
    });

    it('does not move past the edges', () => {
      expect(moveItem(array, 0, -1)).toBe(0);
      expect(moveItem(array, 2, 1)).toBe(2);
      expect(texts(array)).toEqual(['A', 'B', 'C']);
      expect(array.dirty).toBeFalse();
    });

    it('inserts a duplicate right after the source', () => {
      expect(insertAfter(array, 0, complete('A copy'))).toBe(1);
      expect(texts(array)).toEqual(['A', 'A copy', 'B', 'C']);
      expect(insertAfter(array, 3, complete('end'))).toBe(4);
    });

    it('removes and returns the index to select next', () => {
      expect(removeItem(array, 1)).toBe(1);
      expect(texts(array)).toEqual(['A', 'C']);
      expect(removeItem(array, 1)).toBe(0); // removed the last one: select the new last
      expect(removeItem(array, 0)).toBe(-1); // empty
      expect(array.length).toBe(0);
    });
  });

  it('truncates with an ellipsis', () => {
    expect(truncate('  short ', 10)).toBe('short');
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
    expect(truncate(null, 5)).toBe('');
  });
});
