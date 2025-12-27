import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, shareReplay, switchMap, filter, take } from 'rxjs/operators';

export class BaseStoreService<T> {
  private _data$ = new BehaviorSubject<T[] | null>(null);
  private _lastLoaded = 0;
  private _loading$ = new BehaviorSubject<boolean>(false);

  // Default TTL: 5 minutes (300,000 ms)
  protected ttl = 300000;

  constructor() {}

  /**
   * Get the data stream.
   * If data is loaded and within TTL, returns cached data.
   * Otherwise, triggers a fetch via the provided fetchFn.
   * @param fetchFn A function that returns an Observable of the data from the API.
   */
  get$(fetchFn: () => Observable<T[]>): Observable<T[] | null> {
    const now = Date.now();
    const isExpired = now - this._lastLoaded > this.ttl;
    const hasData = this._data$.value !== null;

    if (!hasData || isExpired) {
      this.refresh(fetchFn);
    }

    return this._data$.asObservable();
  }

  /**
   * Force a refresh of the data from the API.
   * @param fetchFn A function that returns an Observable of the data from the API.
   */
  refresh(fetchFn: () => Observable<T[]>): void {
    if (this._loading$.value) {
      return; // Prevent duplicate concurrent fetches
    }

    this._loading$.next(true);

    fetchFn().pipe(
      take(1),
      tap((data) => {
        this._data$.next(data);
        this._lastLoaded = Date.now();
        this._loading$.next(false);
      }),
      shareReplay(1) // Ensure late subscribers get the latest value if needed, though behavior subject handles this
    ).subscribe({
      error: (err) => {
        console.error('Store refresh failed', err);
        this._loading$.next(false);
        // We do not clear data on error to allow stale display if needed, 
        // or you could this._data$.next(null) if you prefer strict error handling.
      }
    });
  }

  /**
   * Invalidate the cache. The next get$ call will trigger a fetch.
   * Useful after Create/Update/Delete operations.
   */
  invalidate(): void {
    this._data$.next(null);
    this._lastLoaded = 0;
  }

  /**
   * Observable to track if data is currently being fetched.
   */
  get loading$(): Observable<boolean> {
    return this._loading$.asObservable();
  }

  /**
   * Get current cached value synchronously (snapshot).
   */
  get value(): T[] | null {
    return this._data$.value;
  }
}
