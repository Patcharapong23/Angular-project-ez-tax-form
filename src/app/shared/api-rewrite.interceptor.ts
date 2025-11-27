import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

type RewriteTarget = string | ((m: any) => string);

const REWRITES: Array<[RegExp, RewriteTarget]> = [
  // auth ของหน้าบ้านเดิม: /api/auth/*  → หลังบ้านจริง: /api/eztax/*
  [/^\/api\/auth(\/.*)?$/i, (m: any) => `/api/eztax${m[1] ?? ''}`],

  // === ใส่ mapping เพิ่มได้ตามหลังบ้านจริง ===
  // [/^\/api\/docs(\/.*)?$/i, (m: any) => `/api/document${m[1] ?? ''}`],
  // [/^\/api\/doc-numbers(\/.*)?$/i, (m: any) => `/api/numbering${m[1] ?? ''}`],
];

function applyRewrites(url: string): string {
  if (!url.startsWith('/api')) return url;
  for (const [from, to] of REWRITES) {
    const match = url.match(from as any);
    if (match) {
      if (typeof to === 'string') return url.replace(from, to);
      // ถ้า to เป็นฟังก์ชัน (อย่างบรรทัดบน) ให้เรียกฟังก์ชันด้วย match
      return (to as any)(match);
    }
  }
  return url;
}

@Injectable()
export class ApiRewriteInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // rewrite เฉพาะที่ยิงไป base /api ของเรา
    if (req.url.startsWith(environment.apiBase)) {
      const newUrl = applyRewrites(req.url);
      if (newUrl !== req.url) {
        req = req.clone({ url: newUrl });
      }
    }
    return next.handle(req);
  }
}
