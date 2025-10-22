// src/app/features/invoice/doc-number.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DocNumberService {
  private base = `${environment.apiBase}/doc-number`;

  constructor(private http: HttpClient) {}

  preview(type: string, branch: string, date: string): Observable<string> {
    const url =
      `${this.base}/preview?` +
      `type=${encodeURIComponent(type)}` +
      `&branch=${encodeURIComponent(branch)}` +
      `&date=${encodeURIComponent(date)}`;

    // backend ส่ง text → ต้อง cast เป็น 'json' เพื่อให้ Angular รับเป็น string ได้
    return this.http.get(url, {
      responseType: 'text' as 'json',
    }) as unknown as Observable<string>;
  }

  lock(type: string, branch: string, date: string): Observable<string> {
    const url =
      `${this.base}/lock?` +
      `type=${encodeURIComponent(type)}` +
      `&branch=${encodeURIComponent(branch)}` +
      `&date=${encodeURIComponent(date)}`;

    return this.http.post(url, null, {
      responseType: 'text' as 'json',
    }) as unknown as Observable<string>;
  }
}
