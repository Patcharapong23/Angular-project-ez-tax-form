// import { Injectable } from '@angular/core';
// import {
//   HttpEvent,
//   HttpHandler,
//   HttpInterceptor,
//   HttpRequest,
// } from '@angular/common/http';
// import { from, Observable, switchMap } from 'rxjs';
// import { OktaAuth } from '@okta/okta-auth-js';

// @Injectable()
// export class AuthInterceptor implements HttpInterceptor {
//   constructor(private oktaAuth: OktaAuth) {}

//   intercept(
//     req: HttpRequest<any>,
//     next: HttpHandler
//   ): Observable<HttpEvent<any>> {
//     return from(this.oktaAuth.getAccessToken()).pipe(
//       switchMap((token) => {
//         if (token) {
//           const clone = req.clone({
//             setHeaders: { Authorization: `Bearer ${token}` },
//           });
//           return next.handle(clone);
//         }
//         return next.handle(req);
//       })
//     );
//   }
// }
import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // ข้าม header สำหรับ endpoint auth
    if (req.url.includes('/auth/login') || req.url.includes('/auth/register')) {
      return next.handle(req);
    }

    const token = localStorage.getItem('auth.token');
    if (token) {
      const cloned = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
      return next.handle(cloned);
    }
    return next.handle(req);
  }
}
