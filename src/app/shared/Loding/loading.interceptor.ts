// loading.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { finalize, Observable } from 'rxjs';
import { LoadingService } from './loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private loading: LoadingService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // ข้าม asset หรือไฟล์เล็ก ๆ ได้ถ้าต้องการ
    if (req.url.includes('/assets/')) return next.handle(req);
    this.loading.show();
    return next.handle(req).pipe(finalize(() => this.loading.hide()));
  }
}
