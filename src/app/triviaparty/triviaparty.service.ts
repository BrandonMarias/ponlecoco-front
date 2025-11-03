import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { TriviaParty } from './triviaparty';
import { Observable, catchError, map } from 'rxjs';

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
    // Remove the 'type' property as backend doesn't expect it for updates
    const { type, ...dataWithoutType } = triviaPartyData;

    return this.http.patch<TriviaParty>(`${this.apiUrl}/${id}`, dataWithoutType).pipe(
      catchError((error) => {
        console.error('Error updating trivia party:', error);
        console.error('Request data sent:', dataWithoutType);
        if (error.error && error.error.message) {
          console.error('Backend validation errors:', error.error.message);
        }
        throw error;
      })
    );
  }

  uploadQuestionImage(image: File): Observable<ImageUploadData> {
    const formData = new FormData();
    formData.append('image', image);
    return this.http
      .post<ApiImageUploadResponse>(
        `${this.apiUrl}/question-image`,
        formData
      )
      .pipe(map((response) => response.data), catchError((error) => {
        console.error('Error uploading question image:', error);
        throw error;
      }));
  }

  // Share/Unshare trivia party
  toggleShareTriviaParty(id: string, isShared: boolean): Observable<TriviaParty> {
    return this.http.patch<TriviaParty>(`${this.apiUrl}/${id}/shared`, { isShared });
  }

  // Get public trivia party
  getPublicTriviaParty(id: string): Observable<TriviaParty> {
    return this.http.get<TriviaParty>(`${environment.apiUrl}/public/triviaparty/${id}`);
  }

  // Generate unique share link
  generateShareLink(id: string): Observable<{ token: string; expiresAt: string }> {
    return this.http.post<{ token: string; expiresAt: string }>(`${this.apiUrl}/${id}/share-link`, {});
  }

  // Get trivia party by token
  getTriviaPartyByToken(token: string): Observable<TriviaParty> {
    return this.http.get<TriviaParty>(`${this.apiUrl}/shared/${token}`);
  }
}
