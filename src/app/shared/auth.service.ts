// src/app/shared/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface AuthResponse {
  token: string;
  refreshToken?: string | null;
  userName: string;
  fullName: string;
  email: string;
  role?: string;
}

export type AddressTh = {
  buildingNo?: string;
  addressDetailTh?: string;
  province?: string;
  district?: string;
  subdistrict?: string;
  zipCode?: string;
};

export interface AuthUser {
  userName: string;
  fullName: string;
  email: string;
  role?: string;

  // optional
  companyName?: string;
  tenantNameTh?: string;
  tenantNameEn?: string;
  username?: string; // legacy fallback
  addressTh?: AddressTh;
}

export interface RegisterDto {
  password: string;
  fullName: string;
  email: string;
  logoImg?: string | null;
  logoUrl?: string;
  tenantNameTh: string;
  tenantNameEn?: string;
  tenantTaxId: string;
  branchCode: string;
  branchNameTh: string;
  branchNameEn?: string;
  tenantTel?: string;
  buildingNo: string;
  addressDetailTh?: string;
  province: string;
  district: string;
  subdistrict: string;
  zipCode: string;
  addressDetailEn?: string;
}

const TOKEN_KEY = 'auth.token';
const REFRESH_KEY = 'auth.refresh';
const USER_KEY = 'auth.user';
const LOGOUT_BC = 'logout.broadcast';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = environment.apiBase; // http://localhost:8080/api
  private _user$ = new BehaviorSubject<AuthUser | null>(readUserFromStorage());
  readonly user$ = this._user$.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // ---- migrate คีย์เก่ามาเป็นคีย์ใหม่ แล้วลบของเก่าให้เกลี้ยง ----
    const legacy = localStorage.getItem('token');
    const modern = localStorage.getItem(TOKEN_KEY);
    if (legacy && !modern) {
      localStorage.setItem(TOKEN_KEY, legacy);
    }
    if (legacy) localStorage.removeItem('token');

    // ถ้าแท็บอื่นลบ token ให้แท็บนี้เด้งออกด้วย
    window.addEventListener('storage', (e) => {
      if (e.key === TOKEN_KEY && e.newValue === null) {
        this.clearUser();
        this.router.navigateByUrl('/login');
      }
    });
  }

  // ---------- token ----------
  get token(): string | null {
    // เผื่อยังมีของเก่า หยิบแบบ fallback ได้
    return localStorage.getItem(TOKEN_KEY) ?? localStorage.getItem('token');
  }
  private setToken(t: string) {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.removeItem('token'); // ล้าง legacy
  }
  private clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('token'); // เผื่อมีตกค้าง
  }

  // ---------- user ----------
  getUser(): AuthUser | null {
    return this._user$.value ?? readUserFromStorage();
  }
  private setUser(u: AuthUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    this._user$.next(u);
  }
  private clearUser() {
    localStorage.removeItem(USER_KEY);
    this._user$.next(null);
  }

  serverLogout() {
    return this.http.post<void>(`${this.base}/auth/logout`, {});
  }

  // ---------- jwt / login state ----------
  decodeToken(): any {
    const t = this.token;
    if (!t) return null;
    const parts = t.split('.');
    if (parts.length < 2) return null;
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    const t = this.token;
    if (!t) return false;
    const payload = this.decodeToken();
    if (!payload?.exp) return true;
    const nowSec = Math.floor(Date.now() / 1000);
    return payload.exp > nowSec;
  }

  logout(broadcast = true): void {
    this.clearToken();
    this.clearUser();

    // ✅ broadcast เฉพาะคนกดออกระบบเอง
    if (broadcast) {
      localStorage.setItem(LOGOUT_BC, String(Date.now()));
    }

    // ไปหน้า login
    this.router.navigateByUrl('/login');
  }

  fetchMe() {
    return this.http.get<AuthUser>(`${this.base}/auth/me`).pipe(
      tap((u) => this['setUser'](u)) // เก็บลง localStorage + push ลง BehaviorSubject
    );
  }
  uploadLogo(file: File, tenantTaxId: string) {
    const form = new FormData();
    form.append('file', file);
    form.append('tenantTaxId', tenantTaxId);
    return this.http.post<{ url: string }>(`${this.base}/files/logo`, form);
  }

  // ---------- API ----------
  login(userName: string, password: string): Observable<AuthResponse> {
    const body = { userName, password };
    return this.http
      .post<AuthResponse>(`${this.base}/auth/login`, body, {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      })
      .pipe(
        tap((res) => {
          this.setToken(res.token);
          const claims = this.decodeToken();
          const role =
            res.role ??
            claims?.role ??
            claims?.roles?.[0] ??
            claims?.authorities?.[0] ??
            undefined;
          const u: AuthUser = {
            userName: res.userName,
            fullName: res.fullName,
            email: res.email,
            role,
          };
          this.setUser(u);
        })
      );
  }

  register(payload: RegisterDto): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/auth/register`, payload, {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      })
      .pipe(
        tap((res) => {
          this.setToken(res.token);
          const claims = this.decodeToken();
          const role =
            res.role ??
            claims?.role ??
            claims?.roles?.[0] ??
            claims?.authorities?.[0] ??
            undefined;
          const u: AuthUser = {
            userName: res.userName,
            fullName: res.fullName,
            email: res.email,
            tenantNameTh: payload.tenantNameTh,
            tenantNameEn: payload.tenantNameEn,
            companyName: payload.tenantNameTh || payload.tenantNameEn,
            addressTh: {
              buildingNo: payload.buildingNo,
              addressDetailTh: payload.addressDetailTh,
              province: payload.province,
              district: payload.district,
              subdistrict: payload.subdistrict,
              zipCode: payload.zipCode,
            },
            role,
          };
          this.setUser(u);
        })
      );
  }
}

// ---------- local helpers ----------
function readUserFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}
