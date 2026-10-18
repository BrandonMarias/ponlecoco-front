import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import CreateRouletteComponent from './create-roulette.component';
import { ModalService } from '../../shared/modal.service';
import { AuthService } from '../../auth/auth.service';

describe('CreateRouletteComponent (quiz editor)', () => {
  let fixture: ComponentFixture<CreateRouletteComponent>;
  let component: CreateRouletteComponent;

  const el = () => fixture.nativeElement as HTMLElement;
  const chips = () => Array.from(el().querySelectorAll('app-quiz-navigator [data-idx]'));
  const fill = (i: number) => component.questions.at(i).patchValue({ question: `q${i}`, answer: `a${i}` });

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: signal({ role: 'admin' }) } },
        { provide: ModalService, useValue: { open: () => Promise.resolve(true), openInput: () => Promise.resolve(null) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CreateRouletteComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('shows the 12 fixed slots with their point values and no add button', () => {
    expect(chips().length).toBe(12);
    const values = component.navItems().map((i) => i.badge);
    expect(values).toEqual(['100', '100', '100', '200', '200', '300', '300', '400', '400', '400', '500', '500']);
    expect(el().querySelector('app-quiz-navigator button[aria-label="Agregar"]')).toBeNull();
    // no duplicate / move / delete for fixed slots
    expect(el().querySelector('button[aria-label="Eliminar pregunta"]')).toBeNull();
    expect(el().querySelector('button[aria-label="Duplicar pregunta"]')).toBeNull();
  });

  it('tracks completeness and jumps to the first incomplete slot on an invalid save', async () => {
    component.titleControl.setValue('Mi ruleta');
    for (let i = 0; i < 12; i++) if (i !== 4) fill(i);
    await fixture.whenStable();
    expect(component.incompleteTotal()).toBe(1);

    component.state.select(9);
    component.onSaveClick();
    expect(component.state.selected()).toBe(4);
  });

  it('review cards carry value badge, answer and missing fields', () => {
    fill(0);
    const [done, empty] = component.reviewCards();
    expect(done.complete).toBeTrue();
    expect(done.badge).toBe('100');
    expect(done.answers[0].text).toBe('a0');
    expect(empty.missing).toEqual(['Pregunta', 'Respuesta']);
  });

  it('prev/next stay within the 12 slots', () => {
    component.state.prev();
    expect(component.state.selected()).toBe(0);
    for (let i = 0; i < 20; i++) component.state.next();
    expect(component.state.selected()).toBe(11);
  });
});
