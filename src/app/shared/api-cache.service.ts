import { Injectable } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';

const STORAGE_PREFIX = 'pc_cache:';

interface CacheEntry {
  data: unknown;
  ts: number;
}

/**
 * Small stale-while-revalidate cache for the user's own GET calls.
 * Memory first, localStorage as fallback so it survives app restarts.
 * Keys are scoped per user and everything is wiped on logout.
 */
@Injectable({ providedIn: 'root' })
export class ApiCacheService {
  private memory = new Map<string, CacheEntry>();

  /**
   * Emits the cached value synchronously (if any), then the fresh value from `fetch`.
   * If a cached value was already emitted, a failing refresh is swallowed.
   */
  swr<T>(key: string, fetch: () => Observable<T>): Observable<T> {
    return new Observable<T>((subscriber: Subscriber<T>) => {
      const scopedKey = this.scope(key);
      const cached = this.read<T>(scopedKey);
      if (cached) {
        subscriber.next(cached.data);
      }

      const sub = fetch().subscribe({
        next: (data) => {
          this.write(scopedKey, data);
          subscriber.next(data);
        },
        error: (err) => {
          if (cached) {
            subscriber.complete();
          } else {
            subscriber.error(err);
          }
        },
        complete: () => subscriber.complete(),
      });
      return () => sub.unsubscribe();
    });
  }

  /** Drops every entry whose key starts with `prefix` (for the current user). */
  invalidate(prefix: string): void {
    const scoped = this.scope(prefix);
    for (const k of [...this.memory.keys()]) {
      if (k.startsWith(scoped)) this.memory.delete(k);
    }
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX + scoped)) localStorage.removeItem(k);
      }
    } catch {
      /* storage unavailable */
    }
  }

  /** Wipes the whole cache (all users). Called on logout. */
  clear(): void {
    this.memory.clear();
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) localStorage.removeItem(k);
      }
    } catch {
      /* storage unavailable */
    }
  }

  private scope(key: string): string {
    let userId = 'anon';
    try {
      const raw = localStorage.getItem('user_data');
      if (raw) userId = JSON.parse(raw)?.id ?? 'anon';
    } catch {
      /* ignore corrupt user_data */
    }
    return `${userId}:${key}`;
  }

  private read<T>(scopedKey: string): { data: T } | null {
    const mem = this.memory.get(scopedKey);
    if (mem) return { data: mem.data as T };
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + scopedKey);
      if (raw) {
        const entry = JSON.parse(raw) as CacheEntry;
        this.memory.set(scopedKey, entry);
        return { data: entry.data as T };
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  private write(scopedKey: string, data: unknown): void {
    const entry: CacheEntry = { data, ts: Date.now() };
    this.memory.set(scopedKey, entry);
    try {
      localStorage.setItem(STORAGE_PREFIX + scopedKey, JSON.stringify(entry));
    } catch {
      /* quota exceeded: memory copy is enough */
    }
  }
}
