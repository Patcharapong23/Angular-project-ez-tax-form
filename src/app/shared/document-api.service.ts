import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DocumentApiService {
  // ปรับ baseUrl ให้ตรงกับ backend ของคุณ
  // แนะนำให้ชี้ไปที่ /api/documents
  private readonly baseUrl = `${environment.apiBase}/documents`;

  constructor(private http: HttpClient) {}

  // สร้างเอกสาร (ถ้ามี)
  create(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, payload);
  }

  // ดึงเอกสาร (ถ้ามี)
  getById(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  // ✅ เมธอดสำคัญ: ดาวน์โหลดไฟล์เอกสาร
  // format รองรับ 'pdf' | 'xlsx' | 'xml' | 'json'
  downloadDocumentFile(
    id: number | string,
    format: 'pdf' | 'xlsx' | 'xml' | 'json' | string
  ): Observable<Blob> {
    const url = `${this.baseUrl}/${id}/export`;
    const params = { format };

    // Accept header (ไม่ใส่ก็ได้ แต่ใส่แล้วชัดเจน)
    let accept = 'application/octet-stream';
    if (format === 'pdf') {
      accept = 'application/pdf';
    } else if (format === 'xlsx') {
      accept =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (format === 'xml') {
      accept = 'application/xml';
    } else if (format === 'json') {
      accept = 'application/json';
    }

    return this.http.get(url, {
      params,
      responseType: 'blob',
      headers: { Accept: accept },
    });
  }
}
