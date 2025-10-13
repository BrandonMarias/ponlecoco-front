import { Injectable } from '@angular/core';

export interface CompressionOptions {
  maxSizeBytes?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  convertPngToJpeg?: boolean;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  wasCompressed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ImageCompressionService {

  async compressImage(
    file: File,
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
    const {
      maxSizeBytes = 3 * 1024 * 1024, // 3 MB
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      convertPngToJpeg = true
    } = options;

    const originalSize = file.size;

    // If file is already small enough, return as is
    if (file.size <= maxSizeBytes) {
      return {
        file,
        originalSize,
        compressedSize: file.size,
        compressionRatio: 0,
        wasCompressed: false
      };
    }

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;

        // If image is very large, reduce dimensions more aggressively
        let targetMaxWidth = maxWidth;
        let targetMaxHeight = maxHeight;

        if (file.size > 10 * 1024 * 1024) { // If > 10MB, be more aggressive
          targetMaxWidth = 1280;
          targetMaxHeight = 720;
        }

        if (width > height) {
          if (width > targetMaxWidth) {
            height = (height * targetMaxWidth) / width;
            width = targetMaxWidth;
          }
        } else {
          if (height > targetMaxHeight) {
            width = (width * targetMaxHeight) / height;
            height = targetMaxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        ctx!.drawImage(img, 0, 0, width, height);

        // Start with specified quality and reduce if needed
        let currentQuality = quality;
        const tryCompress = () => {
          // Determine output format
          const shouldConvertToJpeg = convertPngToJpeg && file.type === 'image/png';
          const outputType = shouldConvertToJpeg ? 'image/jpeg' : file.type;

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Error al comprimir la imagen'));
                return;
              }

              // If still too large and we can reduce quality further
              if (blob.size > maxSizeBytes && currentQuality > 0.1) {
                currentQuality = Math.max(0.1, currentQuality - 0.1);
                tryCompress();
                return;
              }

              // Create new file with compressed data
              const compressedFile = new File([blob], file.name, {
                type: outputType,
                lastModified: Date.now(),
              });

              const compressionRatio = ((originalSize - compressedFile.size) / originalSize) * 100;

              resolve({
                file: compressedFile,
                originalSize,
                compressedSize: compressedFile.size,
                compressionRatio,
                wasCompressed: true
              });
            },
            outputType,
            currentQuality
          );
        };

        tryCompress();
      };

      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = URL.createObjectURL(file);
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  validateImageFile(file: File, maxSizeBytes: number = 3 * 1024 * 1024): { isValid: boolean; errorMessage?: string } {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return {
        isValid: false,
        errorMessage: 'Por favor, selecciona un archivo de imagen válido.'
      };
    }

    // After compression, this should rarely trigger, but keep as final safeguard
    if (file.size > maxSizeBytes) {
      return {
        isValid: false,
        errorMessage: `No se pudo comprimir la imagen lo suficiente. Tamaño actual: ${this.formatFileSize(file.size)}. Por favor, selecciona una imagen más pequeña.`
      };
    }

    return { isValid: true };
  }
}
