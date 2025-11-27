import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export type PartyType = 'JURISTIC' | 'PERSON' | 'FOREIGNER'; // นิติบุคคล / บุคคลธรรมดา / ชาวต่างชาติ

export interface AddressTh {
  buildingNo?: string;
  addressDetailTh?: string;
  province?: string;
  district?: string;
  subdistrict?: string;
  zipCode?: string;
}

export interface BranchSummary {
  id: number;
  code: string; // เช่น 00000
  nameTh: string; // ชื่อสาขา (ไทย)
  nameEn?: string; // ชื่อสาขา (อังกฤษ)
}

export interface TenantProfile {
  tenantId: number;
  tenantNameTh?: string;
  tenantNameEn?: string;
  tenantTaxId: string;
  tel?: string;
  logoUrl?: string;
  addressTh?: AddressTh;
  branches: BranchSummary[];
}

@Injectable({ providedIn: 'root' })
export class TenantService {
  private base = environment.apiBase; // http://localhost:8080/api
  constructor(private http: HttpClient) {}
  me() {
    return this.http.get<TenantProfile>(`${this.base}/tenants/me`);
  }
}
