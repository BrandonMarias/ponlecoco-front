import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { FormGroup } from '@angular/forms';
import CreateTriviaPartyComponent from './create-triviaparty.component';
import { ModalService } from '../../shared/modal.service';
import { AuthService } from '../../auth/auth.service';

describe('CreateTriviaPartyComponent (quiz editor)', () => {
  let fixture: ComponentFixture<CreateTriviaPartyComponent>;
  let component: CreateTriviaPartyComponent;
  let confirm: boolean;

  const el = () => fixture.nativeElement as HTMLElement;
  const valueChips = () => Array.from(el().querySelectorAll('[role="tablist"][aria-label="Valores"] [role="tab"]'));
  const question = (c: number, q: number) => component.questions(c).at(q) as FormGroup;
  const fill = (c: number, q: number, text = `q${c}${q}`) => question(c, q).patchValue({ question: text, answer: `a${c}${q}` });
  const fillCategory = (c: number, title: string) => {
    component.categoryTitle(c).setValue(title);
    for (let q = 0; q < component.questions(c).length; q++) fill(c, q);
  };

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
    fixture = TestBed.createComponent(CreateTriviaPartyComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('starts empty (as before) with an add-category call to action', () => {
    expect(component.categories.length).toBe(0);
    expect(el().querySelector('app-quiz-navigator')).toBeNull();
    expect(valueChips().length).toBe(0);
    expect(el().querySelector('button[aria-label="Agregar categoría"]')).not.toBeNull();
  });

  it('adds a category with 5 value chips 100..500 and selects it', async () => {
    component.addCategory();
    await fixture.whenStable();
    expect(component.categories.length).toBe(1);
    expect(valueChips().map((c) => c.textContent!.trim().split(/\s+/)[0])).toEqual(['100', '200', '300', '400', '500']);
    expect(component.currentList().length).toBe(1);
    expect(component.incompleteTotal()).toBe(6); // title + 5 questions
  });

  it('limits to 6 categories', () => {
    for (let i = 0; i < 8; i++) component.addCategory();
    expect(component.categories.length).toBe(6);
  });

  it('pager walks across categories in order', () => {
    component.addCategory();
    component.addCategory();
    expect(component.totalQuestions()).toBe(10);
    component.selectLinear(7);
    expect([component.selCat(), component.selQ()]).toEqual([1, 2]);
    expect(component.linearIndex()).toBe(7);
    component.selectLinear(4);
    expect([component.selCat(), component.selQ()]).toEqual([0, 4]);
  });

  it('keeps the double-points choice (one per category, toggles off)', () => {
    component.addCategory();
    component.toggleDoublePoints(0, '2');
    expect(component.isDoublePoints(0, 2)).toBeTrue();
    component.toggleDoublePoints(0, '4');
    expect(component.isDoublePoints(0, 2)).toBeFalse();
    expect(component.isDoublePoints(0, 4)).toBeTrue();
    component.toggleDoublePoints(0, '4');
    expect(component.categories.at(0).get('doublePointsQuestion')!.value).toBeNull();
  });

  it('save on an invalid form jumps to the category title, then to the first incomplete question', () => {
    component.titleControl.setValue('Mi trivia');
    component.addCategory();
    component.addCategory();
    fillCategory(0, 'Historia');
    component.selectCategory(0);

    component.onSaveClick();
    expect(component.selCat()).toBe(1); // category 2 has no title

    fillCategory(1, 'Ciencia');
    component.questions(1).at(3).patchValue({ answer: '' });
    component.selectCategory(0);
    component.onSaveClick();
    expect([component.selCat(), component.selQ()]).toEqual([1, 3]);
  });

  it('review cards are grouped by category and flag untitled categories', () => {
    component.addCategory();
    component.addCategory();
    fillCategory(0, 'Historia');
    component.toggleDoublePoints(0, '1');

    const cards = component.reviewCards();
    expect(cards.length).toBe(10);
    expect(cards[0].group).toBe('Historia');
    expect(cards[0].groupIncomplete).toBeFalse();
    expect(cards[1].badge).toBe('×2');
    expect(cards[5].group).toBe('');
    expect(cards[5].groupIncomplete).toBeTrue();
    expect(cards[5].missing).toEqual(['Pregunta', 'Respuesta']);
  });

  it('removes a category after confirmation and reselects', async () => {
    component.addCategory();
    component.addCategory();
    component.selectCategory(1);

    confirm = false;
    await component.removeCategory(1);
    expect(component.categories.length).toBe(2);

    confirm = true;
    await component.removeCategory(1);
    expect(component.categories.length).toBe(1);
    expect(component.selCat()).toBe(0);
  });
});
