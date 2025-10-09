import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../modal.service';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-modal.component.html',
})
export class ConfirmationModalComponent {
  modalService = inject(ModalService);

  onConfirm() {
    this.modalService.confirm();
  }

  onCancel() {
    this.modalService.cancel();
  }
}
