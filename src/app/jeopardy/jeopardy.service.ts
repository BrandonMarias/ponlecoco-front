import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Jeopardy } from './jeopardy';
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
export class JeopardyService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/jeopardy`;

  getJeopardies() {
    return this.http.get<Jeopardy[]>(this.apiUrl);
  }

  createJeopardy(jeopardyData: Omit<Jeopardy, 'id' | 'userId'>) {
    return this.http.post<Jeopardy>(this.apiUrl, jeopardyData);
  }

  deleteJeopardy(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getJeopardyById(id: string) {
    return this.http.get<Jeopardy>(`${this.apiUrl}/${id}`);
  }

  updateJeopardy(id: string, jeopardyData: Omit<Jeopardy, 'id' | 'userId'>) {
    return this.http.patch<Jeopardy>(`${this.apiUrl}/${id}`, jeopardyData);
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
