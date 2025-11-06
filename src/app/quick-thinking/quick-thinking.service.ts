import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { QuickThinking } from './quick-thinking';
import { Observable, map } from 'rxjs';

interface ImageUploadData {
  imageUrl: string;
}

interface ApiImageUploadResponse {
  success: boolean;
  message: string;
  data: ImageUploadData;
}

@Injectable({
  providedIn: 'root',
})
export class QuickThinkingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/quick-thinking`;

  // Get all quick thinking trivias for the user
  getQuickThinkings() {
    return this.http.get<QuickThinking[]>(this.apiUrl);
  }

  // Get a specific quick thinking by ID
  getQuickThinkingById(id: string) {
    return this.http.get<QuickThinking>(`${this.apiUrl}/${id}`);
  }

  // Create a new quick thinking trivia
  createQuickThinking(quickThinkingData: Omit<QuickThinking, 'id' | 'userId'>) {
    return this.http.post<QuickThinking>(this.apiUrl, quickThinkingData);
  }

  // Update an existing quick thinking trivia
  updateQuickThinking(id: string, quickThinkingData: Partial<Omit<QuickThinking, 'id' | 'userId'>>) {
    return this.http.patch<QuickThinking>(`${this.apiUrl}/${id}`, quickThinkingData);
  }

  // Delete a quick thinking trivia
  deleteQuickThinking(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Upload an image for a question
  uploadQuestionImage(image: File): Observable<ImageUploadData> {
    const formData = new FormData();
    formData.append('image', image);
    return this.http
      .post<ApiImageUploadResponse>(
        `${this.apiUrl}/question-image`,
        formData
      )
      .pipe(map((response) => response.data));
  }

  // Share/Unshare quick thinking
  toggleShareQuickThinking(id: string, isShared: boolean): Observable<QuickThinking> {
    return this.http.patch<QuickThinking>(`${this.apiUrl}/${id}/shared`, { isShared });
  }

  // Get public quick thinking
  getPublicQuickThinking(id: string): Observable<QuickThinking> {
    return this.http.get<QuickThinking>(`${environment.apiUrl}/public/quick-thinking/${id}`);
  }

  // Generate unique share link
  generateShareLink(id: string): Observable<{ token: string; expiresAt: string }> {
    return this.http.post<{ token: string; expiresAt: string }>(`${this.apiUrl}/${id}/share-link`, {});
  }

  // Get quick thinking by token
  getQuickThinkingByToken(token: string): Observable<QuickThinking> {
    return this.http.get<QuickThinking>(`${this.apiUrl}/shared/${token}`);
  }
}
