import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../shared/auth.service';

export interface InvoiceItemDto {
  sku: string;
  name: string;
  qty: number;
  price: number;
  discount: number;
  vatRate: number;
  amount: number;
}

export interface CustomerDto {
  partyType: 'PERSON' | 'JURISTIC' | 'FOREIGNER';
  code?: string;
  name: string;
  taxId?: string;
  passportNo?: string;
  branchCode?: string;
  address: string;
  email?: string;
  tel?: string;
  zip?: string;
}

export interface HeaderDto {
  companyName: string;
  taxId: string;
  branchCode: string;
  branchName: string;
  tel: string;
  address: string;

  documentType: string; // code เช่น T01/T02...
  documentTypeTh: string;
  documentTypeEn: string;

  docNo?: string; // backend จะ generate ให้
  issueDate: string; // yyyy-MM-dd
  seller: string;
  template: string; // BASIC ฯลฯ

  logoUrl?: string | null;
}

export interface TotalsDto {
  subtotal: number;
  discount: number;
  netAfterDiscount: number;
  serviceFee: number;
  shippingFee: number;
  vat: number;
  grand: number;
  use4Decimals: boolean;
}

export interface FullInvoicePayload {
  header: HeaderDto;
  customer: CustomerDto;
  items: InvoiceItemDto[];
  remark?: string;
  totals: TotalsDto;
}

export interface SaveDocResponse {
  id: number;
  docNo: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private base = environment.apiBase; // '/api'

  constructor(private http: HttpClient, private auth: AuthService) {}

  private authHeaders(): HttpHeaders {
    const t = this.auth.token;
    return t
      ? new HttpHeaders({
          Authorization: `Bearer ${t}`,
        })
      : new HttpHeaders();
  }

  createDoc(payload: FullInvoicePayload): Observable<SaveDocResponse> {
    return this.http.post<SaveDocResponse>(`${this.base}/docs`, payload, {
      headers: this.authHeaders(),
    });
  }

  downloadDoc(id: number, fmt: 'pdf' | 'xml' | 'csv'): Observable<Blob> {
    return this.http.get(`${this.base}/docs/${id}/${fmt}`, {
      headers: this.authHeaders(),
      responseType: 'blob' as const,
    });
  }
}
