import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import CreateQuickThinkingComponent from './create-quick-thinking.component';
import { ModalService } from '../../shared/modal.service';
import { AuthService } from '../../auth/auth.service';

describe('CreateQuickThinkingComponent (quiz editor)', () => {
  let fixture: ComponentFixture<CreateQuickThinkingComponent>;
  let component: CreateQuickThinkingComponent;
  let http: HttpTestingController;
  let confirm: boolean;

  const chips = () => Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('app-quiz-navigator [data-idx]'));
  const setQuestion = (i: number, text: string) => component.questions.at(i).get('question')!.setValue(text);
  const fillAll = (i: number, prefix: string) => {
    setQuestion(i, prefix);
    component.getOptions(i).controls.forEach((c, o) => c.setValue(`${prefix}-${o}`));
  };
  const texts = () => component.questions.controls.map((c) => c.get('question')!.value);

  beforeEach(async () => {
    localStorage.clear();
    confirm = true;
    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: signal({ role: 'admin' }) } },
        { provide: ModalService, useValue: { open: () => Promise.resolve(confirm), openInput: () => Promise.resolve(null) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateQuickThinkingComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  it('renders one question in the navigator and the 4 option tiles', () => {
    expect(chips().length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('[role="radio"]').length).toBe(4);
  });

  it('rebinds the editor panel to the selected question', async () => {
    fillAll(0, 'A');
    component.addQuestion();
    fillAll(1, 'B');
    const textarea = () => fixture.nativeElement.querySelector('textarea[aria-label="Pregunta"]') as HTMLTextAreaElement;

    component.state.select(0);
    await fixture.whenStable();
    expect(textarea().value).toBe('A');
    expect((fixture.nativeElement.querySelector('textarea[aria-label="Opción 2"]') as HTMLTextAreaElement).value).toBe('A-1');

    component.state.select(1);
    await fixture.whenStable();
    expect(textarea().value).toBe('B');
    expect((fixture.nativeElement.querySelector('textarea[aria-label="Opción 2"]') as HTMLTextAreaElement).value).toBe('B-1');

    // typing in the panel edits the selected question only
    textarea().value = 'B edited';
    textarea().dispatchEvent(new Event('input'));
    expect(texts()).toEqual(['A', 'B edited']);
  });

  it('adds a question and selects it', async () => {
    component.addQuestion();
    await fixture.whenStable();
    expect(chips().length).toBe(2);
    expect(component.state.selected()).toBe(1);
  });

  it('respects MAX_QUESTIONS', () => {
    while (component.questions.length < component.MAX_QUESTIONS) {
      component.addQuestion();
    }
    component.addQuestion();
    component.duplicateQuestion(0);
    expect(component.questions.length).toBe(component.MAX_QUESTIONS);
    expect(component.showToast()).toBeTrue();
  });

  it('duplicates right after the source with its own values', () => {
    fillAll(0, 'A');
    component.addQuestion();
    fillAll(1, 'B');
    component.setCorrectAnswer(component.questions.at(0) as any, 2);

    component.duplicateQuestion(0);

    expect(texts()).toEqual(['A', 'A', 'B']);
    expect(component.state.selected()).toBe(1);
    expect(component.questions.at(1).get('correctAnswerIndex')!.value).toBe(2);
    expect(component.getOptions(1).value).toEqual(['A-0', 'A-1', 'A-2', 'A-3']);
    // independent copy
    setQuestion(1, 'A2');
    expect(texts()).toEqual(['A', 'A2', 'B']);
  });

  it('moves a question and the selection follows it', () => {
    fillAll(0, 'A');
    component.addQuestion();
    fillAll(1, 'B');
    component.state.select(0);

    component.moveQuestion(0, 1);
    expect(texts()).toEqual(['B', 'A']);
    expect(component.state.selected()).toBe(1);

    component.moveQuestion(1, 1); // already last
    expect(texts()).toEqual(['B', 'A']);
    component.moveQuestion(1, -1);
    expect(texts()).toEqual(['A', 'B']);
    expect(component.state.selected()).toBe(0);
  });

  it('deletes after confirmation and keeps the selection valid', async () => {
    for (const p of ['A', 'B', 'C']) {
      if (p !== 'A') component.addQuestion();
      fillAll(component.questions.length - 1, p);
    }
    component.state.select(2);

    confirm = false;
    await component.removeQuestion(2);
    expect(component.questions.length).toBe(3);

    confirm = true;
    await component.removeQuestion(2);
    expect(texts()).toEqual(['A', 'B']);
    expect(component.state.selected()).toBe(1);
  });

  it('never deletes the last remaining question', async () => {
    await component.removeQuestion(0);
    expect(component.questions.length).toBe(1);
  });

  it('writes the same correctAnswerIndex when a tile is marked correct', async () => {
    const check = fixture.nativeElement.querySelectorAll('[role="radio"]')[2] as HTMLButtonElement;
    check.click();
    await fixture.whenStable();
    expect(component.questions.at(0).get('correctAnswerIndex')!.value).toBe(2);
    expect(check.getAttribute('aria-checked')).toBe('true');
  });

  it('flags incomplete questions and jumps to the first one when saving an invalid form', async () => {
    component.titleControl.setValue('Mi trivia');
    fillAll(0, 'A');
    component.addQuestion();
    component.addQuestion();
    fillAll(2, 'C');
    component.state.select(2);
    await fixture.whenStable();

    expect(component.incompleteTotal()).toBe(1);
    expect(chips()[1].getAttribute('aria-label')).toContain('sin completar');

    component.onSaveClick();
    await fixture.whenStable();

    expect(component.state.selected()).toBe(1);
    http.expectNone(() => true);
  });

  it('review cards expose the correct option and what is missing', () => {
    fillAll(0, 'A');
    component.setCorrectAnswer(component.questions.at(0) as any, 3);
    component.addQuestion();
    setQuestion(1, 'solo pregunta');

    const [done, partial] = component.reviewCards();
    expect(done.complete).toBeTrue();
    expect(done.answers.map((a) => a.correct)).toEqual([false, false, false, true]);
    expect(partial.complete).toBeFalse();
    expect(partial.missing).toEqual(['Opción 1, 2, 3, 4']);
  });
});
