import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ApiCacheService } from './api-cache.service';

describe('ApiCacheService', () => {
  let cache: ApiCacheService;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('user_data', JSON.stringify({ id: 'u1' }));
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    cache = TestBed.inject(ApiCacheService);
  });

  afterEach(() => localStorage.clear());

  it('emits only the network value on a cold cache', () => {
    const values: number[] = [];
    cache.swr('k', () => of(1)).subscribe((v) => values.push(v));
    expect(values).toEqual([1]);
  });

  it('emits the cached value first, then the fresh one', () => {
    cache.swr('k', () => of(1)).subscribe();

    const network = new Subject<number>();
    const values: number[] = [];
    cache.swr('k', () => network).subscribe((v) => values.push(v));
    expect(values).toEqual([1]);

    network.next(2);
    expect(values).toEqual([1, 2]);
  });

  it('survives a restart through localStorage', () => {
    cache.swr('k', () => of('saved')).subscribe();
    // a fresh instance has an empty memory map
    const fresh = new ApiCacheService();
    const values: string[] = [];
    fresh.swr('k', () => new Subject<string>()).subscribe((v) => values.push(v));
    expect(values).toEqual(['saved']);
  });

  it('swallows a failed refresh when cached data was shown, propagates otherwise', () => {
    let coldError: unknown;
    cache.swr('cold', () => throwError(() => 'boom')).subscribe({ error: (e) => (coldError = e) });
    expect(coldError).toBe('boom');

    cache.swr('warm', () => of(1)).subscribe();
    let warmError: unknown;
    const values: number[] = [];
    cache
      .swr('warm', () => throwError(() => 'boom'))
      .subscribe({ next: (v) => values.push(v), error: (e) => (warmError = e) });
    expect(values).toEqual([1]);
    expect(warmError).toBeUndefined();
  });

  it('invalidates by prefix', () => {
    cache.swr('trivia:list', () => of(1)).subscribe();
    cache.swr('trivia:abc', () => of(2)).subscribe();
    cache.swr('qt:list', () => of(3)).subscribe();

    cache.invalidate('trivia:');

    const seen: number[] = [];
    cache.swr('trivia:list', () => new Subject<number>()).subscribe((v) => seen.push(v));
    cache.swr('trivia:abc', () => new Subject<number>()).subscribe((v) => seen.push(v));
    cache.swr('qt:list', () => new Subject<number>()).subscribe((v) => seen.push(v));
    expect(seen).toEqual([3]);
  });

  it('scopes entries per user and wipes everything on clear()', () => {
    cache.swr('k', () => of(1)).subscribe();

    localStorage.setItem('user_data', JSON.stringify({ id: 'u2' }));
    const other: number[] = [];
    cache.swr('k', () => new Subject<number>()).subscribe((v) => other.push(v));
    expect(other).toEqual([]);

    localStorage.setItem('user_data', JSON.stringify({ id: 'u1' }));
    cache.clear();
    const after: number[] = [];
    cache.swr('k', () => new Subject<number>()).subscribe((v) => after.push(v));
    expect(after).toEqual([]);
  });
});
