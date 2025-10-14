import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// --- Interfaces ---
export interface InvoiceItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  _id?: string;
  documentNumber?: string;
  documentType: string;
  documentTemplate: string;
  seller: {
    name: string;
    taxId: string;
    address: string;
    phone: string;
  };
  customer: {
    name: string;
    branchCode: string;
    address: string;
    taxId: string;
  };
  issueDate: Date;
  createdAt?: Date;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  status: string;
}

const API_URL = 'http://localhost:4200/invoices';

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  constructor(private http: HttpClient) {}
  // ✅ เพิ่ม: ดึงข้อมูลเอกสารใบเดียว
  getInvoice(id: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${API_URL}/${id}`);
  }

  createInvoice(invoiceData: Invoice): Observable<Invoice> {
    return this.http.post<Invoice>(API_URL, invoiceData);
  }

  // ✅ เมธอดสำหรับดึงข้อมูลทั้งหมด
  getInvoices(filters: any = {}): Observable<Invoice[]> {
    let params = new HttpParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get<Invoice[]>(API_URL, { params });
  }
  // ✅ เพิ่ม: อัปเดตข้อมูลเอกสาร
  updateInvoice(id: string, invoiceData: Invoice): Observable<Invoice> {
    return this.http.put<Invoice>(`${API_URL}/${id}`, invoiceData);
  }

  // ✅ เมธอดสำหรับยกเลิกเอกสาร
  cancelInvoice(id: string): Observable<any> {
    return this.http.put(`${API_URL}/cancel/${id}`, {});
  }
}
