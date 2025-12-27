import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Branch {
  id: number;
  code: string;
  nameTh: string;
  nameEn?: string;
}

export interface CompanyProfile {
  nameTh: string;
  taxId: string;
  tel?: string;
  addressTh?: string;
  logoUrl?: string;
  currentBranch?: Branch;
  branches: Branch[];
}

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private base = environment.apiBase; // '/api'

  constructor(private http: HttpClient) {}

  // ถ้า BE ใส่ทั้งหมดใน /auth/me ก็เรียกผ่าน AuthService.fetchMe() แทนได้
  getMyCompany() {
    return this.http.get<CompanyProfile>(`${this.base}/my/company`);
  }

  getMyBranches() {
    return this.http.get<Branch[]>(`${this.base}/my/branches`);
  }

  previewDocNo(type: string, branchCode: string) {
    return this.http.get<{ docNo: string }>(`${this.base}/docnumbers/preview`, {
      params: { type, branchCode },
    });
  }

  updateSeller(taxId: string, data: any) {
    return this.http.put<CompanyProfile>(`${this.base}/sellers/${taxId}`, data);
  }

  uploadLogo(taxId: string, file: File) {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.post<{ url: string; publicId: string }>(`${this.base}/sellers/${taxId}/logo`, formData);
  }
}
