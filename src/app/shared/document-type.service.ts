import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ตรงนี้ให้ตรงกับ DocumentTypeResponse ของ backend
export interface DocumentTypeOption {
  code: string;
  thName: string;
  enName: string;
  sortOrder: number;
  sign: number;
  isAdjustment: boolean;
}

@Injectable({ providedIn: 'root' })
export class DocumentTypeService {
  private baseUrl = 'http://localhost:8080/api/doc-types';

  constructor(private http: HttpClient) {}

  list(): Observable<DocumentTypeOption[]> {
    return this.http.get<DocumentTypeOption[]>(this.baseUrl);
  }
}
