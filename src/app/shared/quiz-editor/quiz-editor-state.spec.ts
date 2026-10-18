import { QuizEditorState } from './quiz-editor-state';

describe('QuizEditorState', () => {
  let total: number;
  let state: QuizEditorState;

  beforeEach(() => {
    total = 3;
    state = new QuizEditorState(() => total);
  });

  it('starts on the first question with the review closed', () => {
    expect(state.selected()).toBe(0);
    expect(state.reviewOpen()).toBeFalse();
  });

  it('clamps selection to the available questions', () => {
    state.select(2);
    expect(state.selected()).toBe(2);
    state.select(10);
    expect(state.selected()).toBe(2);
    state.select(-4);
    expect(state.selected()).toBe(0);
  });

  it('moves with next / prev without leaving the range', () => {
    state.prev();
    expect(state.selected()).toBe(0);
    state.next();
    state.next();
    state.next();
    expect(state.selected()).toBe(2);
  });

  it('follows the array after a removal', () => {
    state.select(2);
    total = 2;
    state.afterRemove(2);
    expect(state.selected()).toBe(1);
    total = 0;
    state.afterRemove(0);
    expect(state.selected()).toBe(0);
  });

  it('picking a review card closes the overlay and selects the question', () => {
    state.openReview();
    expect(state.reviewOpen()).toBeTrue();
    state.pick(1);
    expect(state.reviewOpen()).toBeFalse();
    expect(state.selected()).toBe(1);
  });
});
