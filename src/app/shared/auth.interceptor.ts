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
