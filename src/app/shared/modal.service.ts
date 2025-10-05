import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

interface ModalData {
  title: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  isOpen = signal(false);
  modalData = signal<ModalData | null>(null);
  private result = new Subject<boolean>();

  open(data: ModalData) {
    this.modalData.set(data);
    this.isOpen.set(true);
    return this.result.asObservable();
  }

  close(confirmed: boolean) {
    this.isOpen.set(false);
    this.result.next(confirmed);
  }
}
