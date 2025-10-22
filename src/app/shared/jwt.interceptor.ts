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
    const token = localStorage.getItem('auth.token');

    if (isApi && !isAuth && token) {
      req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }

    return next.handle(req).pipe(
      catchError((err) => {
        if (err.status === 401) {
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
