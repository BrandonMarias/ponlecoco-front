import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { TriviaParty } from './triviaparty';
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
export class TriviaPartyService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/triviaparty`;

  getTriviaParties() {
    return this.http.get<TriviaParty[]>(this.apiUrl);
  }

  createTriviaParty(triviaPartyData: Omit<TriviaParty, 'id' | 'userId'>) {
    return this.http.post<TriviaParty>(this.apiUrl, triviaPartyData);
  }

  deleteTriviaParty(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getTriviaPartyById(id: string) {
    return this.http.get<TriviaParty>(`${this.apiUrl}/${id}`);
  }

  updateTriviaParty(id: string, triviaPartyData: Omit<TriviaParty, 'id' | 'userId'>) {
    return this.http.patch<TriviaParty>(`${this.apiUrl}/${id}`, triviaPartyData);
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
