import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Roulette } from './roulette';
import { Observable, map, tap } from 'rxjs';
import { ApiCacheService } from '../shared/api-cache.service';

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
export class RouletteService {
  private http = inject(HttpClient);
  private cache = inject(ApiCacheService);
  private apiUrl = `${environment.apiUrl}/roulette`;

  /** Emits the cached list first (if any), then the fresh one. */
  getRoulettes(): Observable<Roulette[]> {
    return this.cache.swr('roulette:list', () => this.http.get<Roulette[]>(this.apiUrl));
  }

  /** Cached detail for the editor: emits the cached copy first (if any), then the fresh one. */
  watchRouletteById(id: string): Observable<Roulette> {
    return this.cache.swr(`roulette:${id}`, () => this.getRouletteById(id));
  }

  createRoulette(rouletteData: Omit<Roulette, 'id' | 'userId'>) {
    return this.http
      .post<Roulette>(this.apiUrl, rouletteData)
      .pipe(tap(() => this.cache.invalidate('roulette:')));
  }

  deleteRoulette(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(tap(() => this.cache.invalidate('roulette:')));
  }

  getRouletteById(id: string) {
    return this.http.get<Roulette>(`${this.apiUrl}/${id}`);
  }

  updateRoulette(id: string, rouletteData: Omit<Roulette, 'id' | 'userId'>) {
    return this.http
      .patch<Roulette>(`${this.apiUrl}/${id}`, rouletteData)
      .pipe(tap(() => this.cache.invalidate('roulette:')));
  }

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

  generateRouletteWithAI(params: { topic?: string; text?: string }): Observable<{ title: string; questions: any[] }> {
    return this.http.post<{ title: string; questions: any[] }>(`${environment.apiUrl}/ai/roulette`, params);
  }

  // Share/Unshare roulette
  toggleShareRoulette(id: string, isShared: boolean): Observable<Roulette> {
    return this.http
      .patch<Roulette>(`${this.apiUrl}/${id}/shared`, { isShared })
      .pipe(tap(() => this.cache.invalidate('roulette:')));
  }

  // Get public roulette
  getPublicRoulette(id: string): Observable<Roulette> {
    return this.http.get<Roulette>(`${environment.apiUrl}/public/roulette/${id}`);
  }

  // Generate unique share link
  generateShareLink(id: string): Observable<{ token: string; expiresAt: string }> {
    return this.http.post<{ token: string; expiresAt: string }>(`${this.apiUrl}/${id}/share-link`, {});
  }

  // Get roulette by token
  getRouletteByToken(token: string): Observable<Roulette> {
    return this.http.get<Roulette>(`${this.apiUrl}/shared/${token}`);
  }
}
