// src/app/shared/jwt.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpErrorResponse,
} from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export class JwtInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const isApi = req.url.startsWith(environment.apiBase);
    const isAuth = isApi && req.url.startsWith(`${environment.apiBase}/auth/`);
    const token = localStorage.getItem('auth.token'); // Directly get the token string
    // console.log('JwtInterceptor: Token found in localStorage', token ? 'present' : 'absent');

    if (isApi && !isAuth && token) {
      console.log('JwtInterceptor: Attaching token to request', req.url);
      req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    } else if (isApi && !isAuth && !token) {
      console.log('JwtInterceptor: No token found for API request (not auth endpoint)', req.url);
    } else if (isAuth) {
      console.log('JwtInterceptor: Auth endpoint, not attaching token', req.url);
    } else {
      console.log('JwtInterceptor: Not an API request, not attaching token', req.url);
    }

    return next.handle(req).pipe(
      catchError((err) => {
        if (err.status === 401) {
          console.warn('JwtInterceptor: Received 401 Unauthorized, clearing token and redirecting to login.', err);
          // รองรับข้อความจากแบ็กเอนด์ เช่น SESSION_EXPIRED/INVALID_OR_EXPIRED
          localStorage.removeItem('auth.token');
          localStorage.removeItem('auth.user');
          // กระตุ้น storage event เพื่อเด้งทุกแท็บ
          localStorage.setItem('logout.broadcast', Date.now().toString());
          localStorage.removeItem('logout.broadcast');
          // ไปหน้า login
          location.assign('/login');
        }
        return throwError(() => err);
      })
    );
  }
}
