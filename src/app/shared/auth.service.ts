import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

const KEY = 'mock-jwt-token';
const USER_KEY = 'auth_user';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
}

/** สำหรับ mock response หลังสมัคร */
export interface RegisterResponse {
  username: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** เก็บสถานะ login ปัจจุบัน */
  private _authState$ = new BehaviorSubject<boolean>(this.hasToken());
  /** สตรีมสถานะสาธารณะ */
  readonly authState$ = this._authState$.asObservable();
  /** alias เพื่อรองรับโค้ดเดิม */
  readonly isAuthenticated$ = this.authState$;

  /** เก็บ returnUrl ชั่วคราว */
  private _returnUrl = '/dashboard';

  // ---------- helpers ----------
  private hasToken(): boolean {
    return !!localStorage.getItem(KEY);
  }

  setReturnUrl(url: string) {
    this._returnUrl = url || '/dashboard';
  }
  getReturnUrl(): string {
    return this._returnUrl || '/dashboard';
  }

  /** ใช้เช็คแบบ synchronous */
  isLoggedIn(): boolean {
    return this.hasToken();
  }

  /** mock login: admin / 123456 */
  login(username: string, password: string): Observable<void> {
    const ok = username?.trim() === 'admin' && password === '123456';
    if (!ok) {
      return throwError(() => new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'));
    }

    return of(void 0).pipe(
      delay(300),
      tap(() => {
        localStorage.setItem(KEY, 'mock-jwt-token');
        const user: AuthUser = {
          id: '1',
          username: 'admin',
          fullName: 'John Doe',
          email: 'john@example.com',
        };
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this._authState$.next(true);
      })
    );
  }

  /** mock register — ส่งไปหลังบ้านได้ภายหลัง (ที่นี่ทำเป็น mock) */
  register(formData: FormData): Observable<RegisterResponse> {
    // คุณจะ map ฟิลด์จริง ๆ จาก formData เพื่อตรวจสอบ/ส่ง API จริงในอนาคตได้
    const username =
      (formData.get('email') as string) ||
      (formData.get('fullName') as string) ||
      'newuser';

    return of<RegisterResponse>({ username }).pipe(delay(400));
  }

  /** mock logout */
  logout(): void {
    localStorage.removeItem(KEY);
    localStorage.removeItem(USER_KEY);
    this._authState$.next(false);
  }

  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    try {
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}
