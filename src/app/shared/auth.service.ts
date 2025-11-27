// src/app/shared/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  tap,
  switchMap,
  map,
  forkJoin,
  catchError,
  throwError,
  of, // Import 'of'
} from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import {
  UserProfile,
  SellerInfo,
  BranchInfo,
} from '../shared/models/user.models';

export interface AuthResponse {
  token: string;
  user: {
    userId: string;
    username: string;
    fullName: string;
    email: string;
    password?: string;
    branchId?: string;
    sellerId?: string;
    enableFlag?: boolean;
    createBy?: string;
    createDate?: string;
    updateBy?: string;
    updateDate?: string;
    authorities: { authority: string }[];
    permissions?: string[];
  };
  seller: {
    sellerId: string;
    sellerTaxId: string;
    sellerNameTh: string;
    sellerNameEn?: string;
    sellerPhoneNumber?: string;
    sellerTypeTax?: string | null;
    logoUrl?: string;
  } | null;
  defaultBranch: {
    branchId: string;
    branchCode: string;
    branchNameTh?: string;
    branchNameEn?: string;
    addressDetailTh?: string;
    addressDetailEn?: string;
    buildingNo?: string;
    subdistrictId?: string;
    districtId?: string;
    provinceId?: string;
    zipCode?: string;
  } | null;
}

export type SellerAddress = {
  buildingNo?: string;
  addressDetailTh?: string;
  addressDetailEn?: string;
  provinceId?: string;
  districtId?: string;
  subdistrictId?: string;
  postalCode?: string;
};

export interface AuthUser {
  userId: string;
  userName: string;
  fullName: string;
  email: string;
  role?: string;

  sellerNameTh?: string;
  sellerNameEn?: string;
  sellerTaxId?: string;
  sellerPhoneNumber?: string;
  logoUrl?: string;
  branchCode?: string;
  branchNameTh?: string;
  branchNameEn?: string;
  sellerAddress?: SellerAddress;
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
    const legacy = localStorage.getItem('token');
    const modern = localStorage.getItem(TOKEN_KEY);
    if (legacy && !modern) {
      localStorage.setItem(TOKEN_KEY, legacy);
    }
    if (legacy) localStorage.removeItem('token');

    window.addEventListener('storage', (e) => {
      if (e.key === TOKEN_KEY && e.newValue === null) {
        this.clearUser();
        this.router.navigateByUrl('/login');
      }
    });
  }

  // ---------- token ----------
  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // refreshToken getter removed as it's no longer stored
  // getTokenObject method is no longer needed in this form


  private setToken(accessToken: string) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.removeItem('token');
  }

  public clearToken() {
    console.log('AuthService: clearToken() called');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem(REFRESH_KEY);
  }

  // ---------- user in memory + localStorage ----------
  public setUser(u: AuthUser) {
    console.log('AuthService: setUser() called with', u);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    this._user$.next(u);
  }

  public clearUser() {
    console.log('AuthService: clearUser() called');
    localStorage.removeItem(USER_KEY);
    this._user$.next(null);
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
    if (!payload || !payload.exp) return false;

    const nowSec = Math.floor(Date.now() / 1000);
    return payload.exp > nowSec;
  }

  logout(broadcast = true): void {
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

  // ---------- New granular API calls (ยังใช้ได้ ถ้าคุณอยากใช้ภายหลัง) ----------
  getMyProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.base}/users/me/profile`);
  }

  getMySeller(): Observable<SellerInfo> {
    return this.http.get<SellerInfo>(`${this.base}/users/me/seller`);
  }

  getMyDefaultBranch(): Observable<BranchInfo> {
    return this.http.get<BranchInfo>(`${this.base}/users/me/branch/default`);
  }

  fetchMe(): Observable<void> {
    return forkJoin([
      this.getMyProfile().pipe(
        catchError((error) => {
          console.error('fetchMe: Error fetching user profile', error);
          return throwError(() => new Error('Failed to fetch user profile')); // Profile is essential, re-throw
        })
      ),
      this.getMySeller().pipe(
        catchError((error) => {
          console.error('fetchMe: Error fetching seller info', error);
          return throwError(() => new Error('Failed to fetch seller info')); // Re-throw error as seller info is essential
        })
      ),
      this.getMyDefaultBranch().pipe(
        catchError((error) => {
          console.error('fetchMe: Error fetching branch info', error);
          return throwError(() => new Error('Failed to fetch branch info')); // Re-throw error as branch info is essential
        })
      ),
    ]).pipe(
      tap(([profile, seller, branch]) => {
        console.log('fetchMe: Profile', profile);
        console.log('fetchMe: Seller', seller);
        console.log('fetchMe: Branch', branch);

        // If profile is null (shouldn't happen with the above catchError, but for safety)
        if (!profile) {
          console.error('fetchMe: Profile data is missing after successful forkJoin.');
          this.clearUser();
          return;
        }

        const u: AuthUser = {
          userId: profile.userId,
          userName: profile.username,
          fullName: profile.fullName,
          email: profile.email,
          role: profile.primaryRole,
          sellerNameTh: seller?.sellerNameTh,
          sellerNameEn: seller?.sellerNameEn,
          sellerTaxId: seller?.sellerTaxId,
          sellerPhoneNumber: seller?.sellerPhoneNumber,
          logoUrl: seller?.logoUrl,
          branchCode: branch?.branchCode,
          branchNameTh: branch?.branchNameTh,
          branchNameEn: branch?.branchNameEn,
          sellerAddress: {
            buildingNo: branch?.buildingNo,
            addressDetailTh: branch?.addressDetailTh,
            addressDetailEn: branch?.addressDetailEn,
            provinceId: branch?.provinceId,
            districtId: branch?.districtId,
            subdistrictId: branch?.subdistrictId,
            postalCode: branch?.zipCode,
          },
        };
        this.setUser(u);
      }),
      catchError((error: any) => {
        // This catchError will only be reached if getMyProfile() re-throws an error
        console.error('fetchMe: Critical error during user data fetching, clearing user', error);
        this.clearUser();
        return throwError(() => new Error('Failed to fetch user details'));
      }),
      map(() => void 0)
    );
  }

  uploadLogo(file: File, tenantTaxId: string) {
    const form = new FormData();
    form.append('file', file);
    form.append('tenantTaxId', tenantTaxId);
    return this.http.post<{ url: string }>(`${this.base}/files/logo`, form);
  }

  // ---------- API : LOGIN (ใช้ response ตั้งค่า user ทันที) ----------
  login(userName: string, password: string): Observable<void> {
    const body = { userName, password };

    return this.http
      .post<any>(`${this.base}/auth/login`, body, {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      })
      .pipe(
        tap((res) => {
          // 1) เก็บ token
          this.setToken(res.token);

          // 2) map response -> AuthUser
          const seller = res.seller;
          const branch = res.defaultBranch;

          const u: AuthUser = {
            userId: res.user.userId,
            userName: res.user.username,
            fullName: res.user.fullName,
            email: res.user.email,
            role: res.user.authorities?.[0]?.authority,
            sellerNameTh: seller?.sellerNameTh,
            sellerNameEn: seller?.sellerNameEn ?? undefined,
            sellerTaxId: seller?.sellerTaxId,
            sellerPhoneNumber: seller?.sellerPhoneNumber,
            logoUrl: seller?.logoUrl,
            branchCode: branch?.branchCode,
            branchNameTh: branch?.branchNameTh,
            branchNameEn: branch?.branchNameEn,
            sellerAddress: {
              buildingNo: branch?.buildingNo,
              addressDetailTh: branch?.addressDetailTh,
              addressDetailEn: branch?.addressDetailEn,
              provinceId: branch?.provinceId,
              districtId: branch?.districtId,
              subdistrictId: branch?.subdistrictId,
              postalCode: branch?.zipCode,
            },
          };

          // 3) เก็บ user ลง localStorage + BehaviorSubject
          this.setUser(u);
        }),
        map(() => void 0)
      );
  }

  register(formData: FormData): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/auth/register`, formData)
      .pipe(
        tap((res) => {
          // ไม่ต้อง setToken/setUser หลัง register ตามที่ตกลงไว้
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
