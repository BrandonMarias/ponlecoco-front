import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmationModalComponent } from './shared/confirmation-modal/confirmation-modal.component';
import { InputModalComponent } from './shared/input-modal/input-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ConfirmationModalComponent, InputModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'jeopardimania-front';
}
