import { Injectable, signal } from '@angular/core';

interface ModalData {
  title: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  // Confirmation Modal
  isOpen = signal(false);
  modalData = signal<ModalData | null>(null);
  private resolve?: (value: boolean) => void;

  // Input Modal
  isInputOpen = signal(false);
  inputModalData = signal<ModalData | null>(null);
  private inputResolve?: (value: string | null) => void;

  open(data: ModalData): Promise<boolean> {
    this.modalData.set(data);
    this.isOpen.set(true);
    return new Promise<boolean>((resolve) => {
      this.resolve = resolve;
    });
  }

  openInput(data: ModalData): Promise<string | null> {
    this.inputModalData.set(data);
    this.isInputOpen.set(true);
    return new Promise<string | null>((resolve) => {
      this.inputResolve = resolve;
    });
  }

  confirm() {
    if (this.resolve) {
      this.resolve(true);
    }
    this.isOpen.set(false);
  }

  cancel() {
    if (this.resolve) {
      this.resolve(false);
    }
    this.isOpen.set(false);
  }

  confirmInput(value: string) {
    if (this.inputResolve) {
      this.inputResolve(value);
    }
    this.isInputOpen.set(false);
  }

  closeInput() {
    if (this.inputResolve) {
      this.inputResolve(null);
    }
    this.isInputOpen.set(false);
  }

  onCancel() {
    this.cancel();
    this.closeInput();
  }

  onConfirm(value?: any) {
    if (this.isOpen()) {
      this.confirm();
    } else if (this.isInputOpen()) {
      this.confirmInput(value);
    }
  }
}
