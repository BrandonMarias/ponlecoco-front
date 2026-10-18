import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { FormControl, Validators } from '@angular/forms';
import { QuizEditorShellComponent } from './quiz-editor-shell.component';
import { AuthService } from '../../auth/auth.service';

@Component({
  imports: [QuizEditorShellComponent],
  template: `
    <app-quiz-editor-shell
      [titleControl]="title"
      [instructions]="['uno', 'dos']"
      [current]="1"
      [total]="3"
      [incompleteCount]="2"
      (prev)="events.push('prev')"
      (next)="events.push('next')"
      (jumpIncomplete)="events.push('jump')"
      (save)="events.push('save')"
    />
  `,
})
class HostComponent {
  title = new FormControl('', Validators.required);
  events: string[] = [];
}

describe('QuizEditorShellComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const el = () => fixture.nativeElement as HTMLElement;
  const popover = () => el().querySelector('[role="region"]');
  const helpButton = () => el().querySelector<HTMLButtonElement>('button[aria-label="Ayuda"]')!;

  async function create() {
    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: signal({ role: 'admin' }) } },
      ],
    });
  });

  it('starts closed and toggles only with the help button', async () => {
    await create();
    expect(popover()).toBeNull();
    helpButton().click();
    await fixture.whenStable();
    expect(popover()).not.toBeNull();
    helpButton().click();
    await fixture.whenStable();
    expect(popover()).toBeNull();
  });

  it('always starts closed, even if it was left open before', async () => {
    await create();
    helpButton().click();
    await fixture.whenStable();
    fixture.destroy();

    await create();
    expect(popover()).toBeNull();
  });

  it('closes the instructions with Escape', async () => {
    await create();
    helpButton().click();
    await fixture.whenStable();
    expect(popover()).not.toBeNull();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(popover()).toBeNull();
  });

  it('Alt+Arrow moves between questions and does not trigger browser history', async () => {
    await create();
    const left = new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, cancelable: true });
    window.dispatchEvent(left);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, cancelable: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true })); // plain arrow: ignored
    expect(fixture.componentInstance.events).toEqual(['prev', 'next']);
    expect(left.defaultPrevented).toBeTrue();
  });

  it('keeps the save button clickable when invalid (so the screen can jump to the problem)', async () => {
    await create();
    el().querySelector<HTMLButtonElement>('button[aria-label="Guardar"]')!.click();
    expect(fixture.componentInstance.events).toContain('save');
  });

  it('shows the incomplete chip and the pager position', async () => {
    await create();
    const chip = el().querySelector<HTMLButtonElement>('button[aria-label^="2 sin completar"]')!;
    expect(chip.textContent).toContain('2 sin completar');
    chip.click();
    expect(fixture.componentInstance.events).toContain('jump');
    expect(el().querySelector('nav[aria-label="Cambiar de pregunta"]')!.textContent).toContain('2 / 3');
  });
});
