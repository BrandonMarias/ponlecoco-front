import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';

export interface AiUsage {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

export const TOO_MANY_REQUESTS_MESSAGE = 'Demasiadas solicitudes, intenta en un momento';

@Injectable({
  providedIn: 'root'
})
export class AiUsageService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private apiUrl = environment.apiUrl;

  usage = signal<AiUsage | null>(null);

  isAdmin = computed(() => this.auth.currentUser()?.role === 'admin');
  /** True only when the quota is known to be exhausted (admins are never limited). */
  exhausted = computed(() => {
    const usage = this.usage();
    return !this.isAdmin() && !!usage && usage.remaining <= 0;
  });

  load() {
    this.http.get<AiUsage>(`${this.apiUrl}/ai/usage`).subscribe({
      next: (usage) => this.usage.set(usage),
      error: () => {}, // el contador es informativo; si falla simplemente no se muestra
    });
  }

  /**
   * Call from the error handler of any AI generation request.
   * Returns the message to show for a 429, or null if the error is not a 429.
   */
  handleError(err: any): string | null {
    if (err?.status !== 429) {
      return null;
    }
    const body = err.error;
    if (body && typeof body.limit === 'number') {
      this.usage.set({
        limit: body.limit,
        used: body.used ?? body.limit,
        remaining: 0,
        resetsAt: body.resetsAt,
      });
      this.load();
      return body.message || 'Has alcanzado tu límite mensual de generaciones con IA.';
    }
    return TOO_MANY_REQUESTS_MESSAGE;
  }
}
