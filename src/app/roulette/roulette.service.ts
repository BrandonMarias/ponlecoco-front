import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Roulette } from './roulette';
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
export class RouletteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/roulette`;

  getRoulettes() {
    return this.http.get<Roulette[]>(this.apiUrl);
  }

  createRoulette(rouletteData: Omit<Roulette, 'id' | 'userId'>) {
    return this.http.post<Roulette>(this.apiUrl, rouletteData);
  }

  deleteRoulette(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getRouletteById(id: string) {
    return this.http.get<Roulette>(`${this.apiUrl}/${id}`);
  }

  updateRoulette(id: string, rouletteData: Omit<Roulette, 'id' | 'userId'>) {
    return this.http.patch<Roulette>(`${this.apiUrl}/${id}`, rouletteData);
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
}
