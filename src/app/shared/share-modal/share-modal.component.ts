import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-share-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './share-modal.component.html',
})
export class ShareModalComponent {
  // Input signals
  title = input<string>('Compartir Trivia');
  shareUrl = input<string>('');
  loading = input<boolean>(false);

  // Output signals
  close = output<void>();
  generateLink = output<void>();
  makePublic = output<void>();

  // Local signals
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
    const url = this.shareUrl();
    if (!url) return;

    navigator.clipboard.writeText(url).then(() => {
      this.showToastNotification('✅ Enlace copiado al portapapeles');
    }).catch(() => {
      this.showToastNotification('❌ Error al copiar el enlace');
    });
  }

  async shareLink() {
    const url = this.shareUrl();
    if (!url) return;

    // Check if Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share({
          title: this.title(),
          text: 'Únete a jugar esta trivia',
          url: url,
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
