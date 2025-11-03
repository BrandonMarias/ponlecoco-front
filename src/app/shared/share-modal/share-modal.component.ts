import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-share-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './share-modal.component.html',
})
export class ShareModalComponent {
  @Input() title = 'Compartir Trivia';
  @Input() shareUrl = '';
  @Input() loading = false;
  @Output() close = new EventEmitter<void>();
  @Output() generateLink = new EventEmitter<void>();
  @Output() makePublic = new EventEmitter<void>();

  showToast = signal(false);
  toastMessage = signal('');

  onClose() {
    this.close.emit();
  }

  onGenerateLink() {
    this.generateLink.emit();
  }

  onMakePublic() {
    this.makePublic.emit();
  }

  copyToClipboard() {
    if (!this.shareUrl) return;
    
    navigator.clipboard.writeText(this.shareUrl).then(() => {
      this.showToastNotification('✅ Enlace copiado al portapapeles');
    }).catch(() => {
      this.showToastNotification('❌ Error al copiar el enlace');
    });
  }

  async shareLink() {
    if (!this.shareUrl) return;

    // Check if Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share({
          title: this.title,
          text: 'Únete a jugar esta trivia',
          url: this.shareUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
          this.copyToClipboard();
        }
      }
    } else {
      // Fallback to copy
      this.copyToClipboard();
    }
  }

  private showToastNotification(message: string) {
    this.toastMessage.set(message);
    this.showToast.set(true);
    setTimeout(() => {
      this.showToast.set(false);
    }, 3000);
  }
}
