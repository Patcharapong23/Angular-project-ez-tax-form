import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';

export interface RegisterResponse {
  id: string;
  email: string;
  fullName: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly KEY = 'ez_auth_token';
  private _isAuthenticated$ = new BehaviorSubject<boolean>(
    !!localStorage.getItem(this.KEY)
  );
  isAuthenticated$ = this._isAuthenticated$.asObservable();

  private MOCK_USER = {
    email: 'demo@ez-tax.com',
    password: 'Demo@2025!',
    fullName: 'John Doe',
  };

  login(email: string, password: string): Observable<{ token: string }> {
    if (
      email === this.MOCK_USER.email &&
      password === this.MOCK_USER.password
    ) {
      const token = 'mock-jwt-token';
      localStorage.setItem(this.KEY, token);
      this._isAuthenticated$.next(true);
      return of({ token });
    }
    return throwError(() => new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง'));
  }

  logout(): void {
    localStorage.removeItem(this.KEY);
    this._isAuthenticated$.next(false);
  }

  // ✅ mock register ให้ component เรียกใช้ได้
  register(_data: FormData): Observable<RegisterResponse> {
    return of({
      id: '1',
      email: this.MOCK_USER.email,
      fullName: this.MOCK_USER.fullName,
    });
  }
}
