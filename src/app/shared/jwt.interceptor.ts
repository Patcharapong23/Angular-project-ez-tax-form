// src/app/shared/jwt.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isApi = req.url.startsWith(environment.apiBase);
    const isAuthEndpoint = isApi && (
      req.url.includes('/auth/login') ||
      req.url.includes('/auth/register') ||
      req.url.includes('/auth/refresh') ||
      req.url.includes('/auth/logout')
    );

    // Check if this is a retried request (already refreshed once)
    const isRetried = req.headers.has('X-Token-Refreshed');

    // Get token from memory (AuthService)
    const token = this.authService.token;

    // Add Authorization header for API requests (except auth endpoints)
    if (isApi && !isAuthEndpoint) {
      console.log('[JWT_INTERCEPTOR] Token for', req.url, ':', token ? 'PRESENT' : 'MISSING');
      if (token) {
        req = this.addToken(req, token);
      }
    }

    // Add withCredentials for auth endpoints (cookie support)
    if (isAuthEndpoint) {
      req = req.clone({ withCredentials: true });
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // Skip refresh logic for auth endpoints
        if (isAuthEndpoint) {
          return throwError(() => error);
        }

        // Handle 401/403 errors with auto-refresh
        // But only if this is NOT already a retried request
        if ((error.status === 401 || error.status === 403) && !isRetried) {
          console.log('[JWT_INTERCEPTOR] Got', error.status, '- attempting refresh');
          return this.handle401Error(req, next);
        }

        // If retried request still fails, don't try again - just show error
        if (isRetried && (error.status === 401 || error.status === 403)) {
          console.error('[JWT_INTERCEPTOR] Retry also failed with', error.status, '- user may not have permission');
        }

        return throwError(() => error);
      })
    );
  }

  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      console.log('[JWT_INTERCEPTOR] Starting token refresh...');

      return this.authService.refreshAccessToken().pipe(
        switchMap((token: string | null) => {
          this.isRefreshing = false;
          
          if (token) {
            console.log('[JWT_INTERCEPTOR] Token refreshed, retrying request:', request.url);
            this.refreshTokenSubject.next(token);
            // Add header to mark this as a retried request
            const retriedRequest = request.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`,
                'X-Token-Refreshed': 'true'
              }
            });
            return next.handle(retriedRequest);
          }
          
          // Refresh failed, logout
          console.log('[JWT_INTERCEPTOR] Refresh failed, logging out');
          this.authService.logout(false);
          return throwError(() => new Error('Session expired'));
        }),
        catchError((err) => {
          this.isRefreshing = false;
          console.error('[JWT_INTERCEPTOR] Refresh error:', err);
          this.authService.logout(false);
          return throwError(() => err);
        })
      );
    } else {
      // Wait for the ongoing refresh to complete
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(token => {
          const retriedRequest = request.clone({
            setHeaders: {
              Authorization: `Bearer ${token!}`,
              'X-Token-Refreshed': 'true'
            }
          });
          return next.handle(retriedRequest);
        })
      );
    }
  }
}
