// src/app/shared/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  tap,
  map,
  catchError,
  throwError,
  of,
} from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface AuthResponse {
  token: string;
  user: {
    userId: string;
    username: string;
    fullName: string;
    email: string;
    branchId?: string;
    sellerId?: string;
    enableFlag?: boolean;
    authorities: { authority: string }[];
    permissions?: string[];
  };
  seller: {
    sellerId: string;
    sellerTaxId: string;
    sellerNameTh: string;
    sellerNameEn?: string;
    sellerPhoneNumber?: string;
    logoUrl?: string;
  } | null;
  defaultBranch: {
    branchId: string;
    branchCode: string;
    branchNameTh?: string;
    branchNameEn?: string;
    addressDetailTh?: string;
  } | null;
  roleLevel?: string;
  roleName?: string;
}

// Lightweight user data for UI (minimal sensitive info)
export interface AuthUser {
  userId: string;
  userName: string;
  fullName: string;
  email: string;
  roles: string[];
  permissions?: string[];  // e.g. ['DASHBOARD_VIEW', 'DOC_ADD', 'DOC_EDIT']
  roleLevel?: string;      // e.g. 'HQ_ADMIN', 'BRANCH_ADMIN'
  roleName?: string;       // e.g. 'ผู้ดูแลสาขาสำนักงานใหญ่'
  // Seller info
  sellerId?: string;
  sellerNameTh?: string;
  sellerNameEn?: string;
  sellerTaxId?: string;
  sellerPhoneNumber?: string;
  logoUrl?: string;
  // Branch info
  branchId?: string;
  branchCode?: string;
  branchNameTh?: string;
  branchNameEn?: string;
  // Address info
  sellerAddress?: {
    buildingNo?: string;
    addressDetailTh?: string;
    addressDetailEn?: string;
    provinceId?: string;
    districtId?: string;
    subdistrictId?: string;
    postalCode?: string;
  };
  fullAddressTh?: string;
  fullAddressEn?: string;
  mustChangePassword?: boolean;
}

export interface RegisterDto {
  password: string;
  fullName: string;
  email: string;
  sellerNameTh: string;
  sellerNameEn?: string;
  sellerTaxId: string;
  sellerPhoneNumber?: string;
  branchCode: string;
  branchNameTh: string;
  branchNameEn?: string;
  buildingNo: string;
  addressDetailTh?: string;
  addressDetailEn?: string;
  provinceId: string;
  districtId: string;
  subdistrictId: string;
  postalCode: string;
  acceptTos: boolean;
}

const USER_KEY = 'auth.user';
const LOGOUT_BC = 'logout.broadcast';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = environment.apiBase;
  
  // Token stored in MEMORY only (not localStorage)
  private _accessToken: string | null = null;
  
  // User data BehaviorSubject
  private _user$ = new BehaviorSubject<AuthUser | null>(readUserFromStorage());
  readonly user$ = this._user$.asObservable();

  // Permissions BehaviorSubject (in memory)
  private _permissions$ = new BehaviorSubject<string[]>([]);
  readonly permissions$ = this._permissions$.asObservable();

  // Refresh in progress flag (prevent duplicate calls)
  private _refreshInProgress = false;

  constructor(private http: HttpClient, private router: Router) {
    // Listen for logout from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === LOGOUT_BC) {
        this._accessToken = null;
        this.clearUser();
        this.router.navigateByUrl('/login');
      }
    });
  }

  // === TOKEN MANAGEMENT (Memory Only) ===
  
  get token(): string | null {
    return this._accessToken;
  }

  private setToken(accessToken: string) {
    this._accessToken = accessToken;
    // Also clear legacy localStorage token if exists
    localStorage.removeItem('auth.token');
    localStorage.removeItem('token');
  }

  public clearToken() {
    console.log('AuthService: clearToken() called');
    this._accessToken = null;
    // Clear legacy
    localStorage.removeItem('auth.token');
    localStorage.removeItem('token');
    localStorage.removeItem('auth.refresh');
  }

  // === USER MANAGEMENT (Minimal data in localStorage) ===
  
  public setUser(u: AuthUser) {
    console.log('AuthService: setUser() called with', u.userName);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    this._user$.next(u);
  }

  public clearUser() {
    console.log('AuthService: clearUser() called');
    localStorage.removeItem(USER_KEY);
    this._user$.next(null);
  }

  get currentUser(): AuthUser | null {
    return this._user$.value;
  }

  // === JWT VALIDATION ===
  
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

  isTokenExpired(): boolean {
    const payload = this.decodeToken();
    if (!payload || !payload.exp) return true;
    const nowSec = Math.floor(Date.now() / 1000);
    return payload.exp <= nowSec;
  }

  isLoggedIn(): boolean {
    // Check if we have a valid token in memory
    if (this._accessToken && !this.isTokenExpired()) {
      return true;
    }
    // If no token but have user, might need refresh
    if (this._user$.value) {
      return true; // Will trigger rehydration
    }
    return false;
  }

  // === LOGIN ===
  
  login(userName: string, password: string): Observable<void> {
    const body = { userName, password };
    console.log('AuthService: login() called with', userName);

    return this.http
      .post<any>(`${this.base}/auth/login`, body, {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
        withCredentials: true, // Important for HttpOnly cookie
      })
      .pipe(
        tap((res) => {
          // Store token in memory
          this.setToken(res.token);

          // Map to lightweight AuthUser
          const seller = res.seller;
          const branch = res.defaultBranch;
          const authorities = res.user.authorities || [];

          const u: AuthUser = {
            userId: res.user.userId,
            userName: res.user.username,
            fullName: res.user.fullName,
            email: res.user.email,
            roles: authorities.map((a: any) => a.authority),
            roleLevel: res.roleLevel,
            roleName: res.roleName,
            // Seller info
            sellerId: seller?.sellerId,
            sellerNameTh: seller?.sellerNameTh,
            sellerNameEn: seller?.sellerNameEn,
            sellerTaxId: seller?.sellerTaxId,
            sellerPhoneNumber: seller?.sellerPhoneNumber,
            logoUrl: seller?.logoUrl,
            // Branch info
            branchId: branch?.branchId,
            branchCode: branch?.branchCode,
            branchNameTh: branch?.branchNameTh,
            branchNameEn: branch?.branchNameEn,
            // Address info
            sellerAddress: {
              buildingNo: branch?.buildingNo,
              addressDetailTh: branch?.addressDetailTh,
              addressDetailEn: branch?.addressDetailEn,
              provinceId: branch?.provinceId,
              districtId: branch?.districtId,
              subdistrictId: branch?.subdistrictId,
              postalCode: branch?.zipCode,
            },
            fullAddressTh: (res as any).fullAddressTh,
            fullAddressEn: (res as any).fullAddressEn,
            mustChangePassword: (res.user as any).mustChangePassword
          };

          this.setUser(u);
        }),
        map(() => void 0)
      );
  }

  // === LOGOUT ===
  
  logout(broadcast = true): void {
    // Call backend logout (clears cookie)
    this.http.post(`${this.base}/auth/logout`, {}, { withCredentials: true })
      .subscribe({
        next: () => console.log('Backend logout successful'),
        error: (err) => console.warn('Backend logout error:', err)
      });

    this.clearToken();
    this.clearUser();

    if (broadcast) {
      localStorage.setItem(LOGOUT_BC, String(Date.now()));
    }
    this.router.navigateByUrl('/login');
  }

  public logoutToLogin(): void {
    this.logout(false);
    this.router.navigateByUrl('/login');
  }

  // === REHYDRATION (Restore session on page load) ===
  
  rehydrate(): Observable<boolean> {
    if (this._refreshInProgress) {
      console.log('AuthService: Refresh already in progress');
      return of(false);
    }

    console.log('AuthService: Attempting rehydration via refresh');
    this._refreshInProgress = true;

    return this.http
      .post<any>(`${this.base}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((res) => {
          console.log('AuthService: Rehydration successful');
          this.setToken(res.token);
          
          // Map to lightweight AuthUser (Same logic as login)
          const seller = res.seller;
          const branch = res.defaultBranch;
          const authorities = res.user.authorities || [];

          const u: AuthUser = {
            userId: res.user.userId,
            userName: res.user.username,
            fullName: res.user.fullName,
            email: res.user.email,
            roles: authorities.map((a: any) => a.authority),
            roleLevel: (res as any).roleLevel,
            roleName: (res as any).roleName,
            // Seller info
            sellerId: seller?.sellerId,
            sellerNameTh: seller?.sellerNameTh,
            sellerNameEn: seller?.sellerNameEn,
            sellerTaxId: seller?.sellerTaxId,
            sellerPhoneNumber: seller?.sellerPhoneNumber,
            logoUrl: seller?.logoUrl,
            // Branch info
            branchId: branch?.branchId,
            branchCode: branch?.branchCode,
            branchNameTh: branch?.branchNameTh,
            branchNameEn: branch?.branchNameEn,
            // Address info
            sellerAddress: {
              buildingNo: branch?.buildingNo,
              addressDetailTh: branch?.addressDetailTh,
              addressDetailEn: branch?.addressDetailEn,
              provinceId: branch?.provinceId,
              districtId: branch?.districtId,
              subdistrictId: branch?.subdistrictId,
              postalCode: branch?.zipCode,
            },
            fullAddressTh: (res as any).fullAddressTh,
            fullAddressEn: (res as any).fullAddressEn,
          };

          this.setUser(u);
          this._refreshInProgress = false;
        }),
        map(() => true),
        catchError((err) => {
          console.warn('AuthService: Rehydration failed', err?.status);
          this._refreshInProgress = false;
          this.clearToken();
          this.clearUser();
          return of(false);
        })
      );
  }

  // === REFRESH TOKEN (For interceptor) ===
  
  refreshAccessToken(): Observable<string | null> {
    if (this._refreshInProgress) {
      console.log('AuthService: Refresh already in progress, waiting...');
      return of(null);
    }

    this._refreshInProgress = true;

    return this.http
      .post<any>(`${this.base}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((res) => {
          console.log('AuthService: Token refreshed');
          this.setToken(res.token);
          this._refreshInProgress = false;
        }),
        map((res) => res.token),
        catchError((err) => {
          console.error('AuthService: Token refresh failed', err);
          this._refreshInProgress = false;
          this.logout(false);
          return of(null);
        })
      );
  }

  // === REGISTER ===
  
  register(formData: FormData): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/auth/register`, formData)
      .pipe(
        tap((res) => {
          // Don't auto-login after register
        })
      );
  }

  changePassword(newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/change-password`, { newPassword }, { withCredentials: true });
  }

  // === PERMISSION CHECK ===
  
  hasRole(role: string): boolean {
    const user = this._user$.value;
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some((r) => this.hasRole(r));
  }

  // Check if user has specific permission (e.g. 'DOC_ADD', 'CUSTOMER_DELETE')
  hasPermission(permission: string): boolean {
    const permissions = this._permissions$.value;
    return permissions.includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((p) => this.hasPermission(p));
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every((p) => this.hasPermission(p));
  }

  // Get current user's role level
  get currentRoleLevel(): string | undefined {
    const user = this._user$.value;
    return user?.roleLevel;
  }

  // Load permissions from backend API
  loadPermissions(): Observable<string[]> {
    const user = this._user$.value;
    if (!user) {
      return of([]);
    }

    return this.http
      .get<{ permissions: string[]; roles: string[] }>(`${this.base}/users/${user.userId}/permissions`)
      .pipe(
        tap((res) => {
          console.log('AuthService: Loaded permissions', res.permissions?.length || 0);
          this._permissions$.next(res.permissions || []);
          
          // Also update user with roleLevel if available
          // FIX: Do NOT overwrite roleLevel with roleCode!
          // if (res.roles && res.roles.length > 0) {
          //   const updatedUser = { ...user, roleLevel: res.roles[0] };
          //   this.setUser(updatedUser);
          // }
        }),
        map((res) => res.permissions || []),
        catchError((err) => {
          console.warn('Failed to load permissions', err);
          return of([]);
        })
      );
  }
}

// Helper function
function readUserFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}
