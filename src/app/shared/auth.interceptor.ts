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
import { environment } from '../../environments/environment'; // Import environment

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const tokenString = localStorage.getItem('auth.token');
    const isApi = req.url.startsWith(environment.apiBase);

    if (tokenString && isApi) {
      try {
        const tokenObj = JSON.parse(tokenString);
        const accessToken = tokenObj.accessToken;
        if (accessToken) {
          req = req.clone({
            setHeaders: { Authorization: `Bearer ${accessToken}` },
          });
        }
      } catch (e) {
        console.error('Could not parse auth token:', e);
      }
    }
    return next.handle(req);
  }
}
