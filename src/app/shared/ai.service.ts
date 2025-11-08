import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AiCategoryResponse } from './ai.interface';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  generateCategory(params: { topic?: string; text?: string }) {
    return this.http.post<AiCategoryResponse>(`${this.apiUrl}/ai/triviaparty`, params);
  }
}
