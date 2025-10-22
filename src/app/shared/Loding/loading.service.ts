import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private pending = 0;
  private _isLoading$ = new BehaviorSubject(false);
  readonly isLoading$ = this._isLoading$.asObservable();

  show() {
    if (++this.pending === 1) this._isLoading$.next(true);
  }
  hide() {
    if (this.pending > 0 && --this.pending === 0) this._isLoading$.next(false);
  }
}
