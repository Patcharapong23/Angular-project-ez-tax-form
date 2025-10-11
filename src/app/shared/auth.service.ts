import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// (ยืนยัน) Interface นี้ถูกต้อง ตรงกับข้อมูลใน JWT Token จาก Backend
export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  companyName: string;
  branchCode: string;
  branchName: string;
  taxId: string;
  businessPhone: string;
}

export interface RegisterResponse {
  msg: string;
  username: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api/auth';
  private returnUrl = '/dashboard';

  constructor(private http: HttpClient) {}

  login(credentials: any): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(
      `${this.apiUrl}/login`,
      credentials
    );
  }

  register(userData: any): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(
      `${this.apiUrl}/register`,
      userData
    );
  }

  logout(): void {
    localStorage.removeItem('token');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  setReturnUrl(url: string): void {
    this.returnUrl = url;
  }

  getReturnUrl(): string {
    return this.returnUrl;
  }

  getUser(): AuthUser | null {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user;
    } catch (e) {
      console.error('Invalid token', e);
      return null;
    }
  }
}
