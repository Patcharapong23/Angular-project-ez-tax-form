import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { tap, map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface RegisterResponse {
  id: string;
  userName: string; // <-- backend ส่ง userName (N ใหญ่)
  email: string;
  firstName: string; // <-- backend ส่ง firstName
  mustChangePassword?: boolean;
}

export interface LoginResponse {
  token: string; // <-- backend ส่ง token เท่านั้น (บวก mustChangePassword ถ้ามี)
  mustChangePassword?: boolean;
}

export interface AuthUser {
  id?: string;
  userName: string; // <-- canonical
  username?: string; // compat กับโค้ดเก่า
  firstName?: string;
  fullName?: string;
  email?: string;

  // สคีมาใหม่ (จาก register)
  tenantNameTh?: string;
  tenantNameEn?: string;
  tenantTaxId?: string;
  tenantTel?: string;
  buildingNo?: string;
  addressDetailTh?: string;
  province?: string;
  district?: string;
  subdistrict?: string;
  zipCode?: string;
  addressDetailEn?: string;

  // legacy สำหรับจุดที่ยังใช้ของเก่า
  companyName?: string;
  taxId?: string;
  businessPhone?: string;
  addressTh?: {
    buildingNo?: string;
    street?: string;
    subdistrict?: string;
    district?: string;
    province?: string;
    postalCode?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'ez_auth_token';
  private readonly USER_KEY = 'ez_auth_user';

  private _isAuth$ = new BehaviorSubject<boolean>(
    !!localStorage.getItem('ez_auth_token')
  );
  isAuthenticated$ = this._isAuth$.asObservable();

  private _currentUser: AuthUser | null = null;

  constructor(private http: HttpClient) {
    const rawUser = localStorage.getItem(this.USER_KEY);
    if (rawUser) {
      try {
        this._currentUser = JSON.parse(rawUser) as AuthUser;
      } catch {}
    }
  }

  /** ใช้ใน component อื่น ๆ */
  getUser(): AuthUser | null {
    return this._currentUser;
  }

  setUser(u: AuthUser | null) {
    this._currentUser = u;
    if (u) localStorage.setItem(this.USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(this.USER_KEY);
  }

  get token(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /** Login ด้วย userName / password → ได้ token (และ mustChangePassword ถ้ามี) */
  login(userName: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, {
        userName,
        password,
      })
      .pipe(
        tap((res) => {
          localStorage.setItem(this.TOKEN_KEY, res.token);
          // ถ้าไม่มี user ใน storage ให้บันทึกขั้นต่ำจาก userName ที่ใช้ login
          if (!this._currentUser) {
            this.setUser({ userName });
          } else {
            // ensure userName sync
            this.setUser({ ...this._currentUser, userName });
          }
          this._isAuth$.next(true);
        }),
        catchError((err) => throwError(() => err))
      );
  }

  /** Register → backend คืน id, userName, firstName, email,… */
  register(payload: any): Observable<AuthUser> {
    return this.http
      .post<RegisterResponse>(`${environment.apiUrl}/auth/register`, payload)
      .pipe(
        map((res) => {
          const user: AuthUser = {
            id: res.id,
            userName: res.userName,
            username: res.userName, // compat
            firstName: res.firstName,
            fullName: res.firstName, // สำหรับจุดที่ยัง refer fullName
            email: res.email,
          };
          this.setUser(user);
          return user;
        }),
        catchError((err) => throwError(() => err))
      );
  }

  /** logout */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._currentUser = null;
    this._isAuth$.next(false);
  }

  // ===== optional: ถอด JWT เฉพาะ client =====
  decodeToken(): any {
    const t = this.token;
    if (!t) return {};
    try {
      const p = t.split('.')[1] || '';
      const pad = '='.repeat((4 - (p.length % 4)) % 4);
      const base64 = (p + pad).replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return {};
    }
  }
  isLoggedIn(): boolean {
    const token = this.token; // ใช้ getter เดิม
    if (!token) return false;

    // ถอด JWT payload แล้วเช็ค exp ถ้ามี
    try {
      const payload = this.decodeToken?.() || {}; // มีอยู่แล้วในเวอร์ชันก่อนหน้า
      // ถ้า backend ออก exp มากับ token
      if (payload && typeof payload.exp === 'number') {
        // exp เป็นวินาที → เปรียบเทียบกับเวลาปัจจุบัน (ms)
        return Date.now() < payload.exp * 1000;
      }
      // ถ้าไม่มี exp ให้ถือว่าแค่มี token ก็พอ
      return true;
    } catch {
      return false;
    }
  }
}
