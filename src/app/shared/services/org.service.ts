// src/app/shared/services/org.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SellerProfile {
  companyName: string;
  taxId: string;
  branchCode: string;
  branchName: string;
  tel?: string;
  address: string;
  logoUrl?: string;
  branches: { code: string; name: string }[];
}

@Injectable({ providedIn: 'root' })
export class OrgService {
  private api = environment.apiBase; // ใช้ตัวเดียวกับ DocumentService

  constructor(private http: HttpClient) {}
  me(): Observable<SellerProfile> {
    return this.http.get<SellerProfile>(`${this.api}/auth/me`).pipe(
      catchError(() =>
        of({
          companyName: '',
          taxId: '',
          branchCode: '00000',
          branchName: 'สำนักงานใหญ่',
          tel: '',
          address: '',
          logoUrl: '',
          branches: [{ code: '00000', name: 'สำนักงานใหญ่' }],
        } as SellerProfile)
      )
    );
  }
  /** โหลดข้อมูลผู้ขายของผู้ใช้ปัจจุบัน + รายการสาขา */
  loadSellerProfile(): Observable<SellerProfile> {
    return this.http.get<any>(`${this.api}/auth/me`).pipe(
      map((me: any) => {
        console.log('OrgService: /auth/me response:', me);
        const profile: SellerProfile = {
          companyName: me.sellerNameTh || me.sellerNameEn || '',
          taxId: me.sellerTaxId || '',
          branchCode: me.branchCode || '00000',
          branchName: me.branchNameTh || me.branchNameEn || 'สำนักงานใหญ่',
          tel: me.sellerPhone || '',
          address: me.addressDetailTh || '',
          logoUrl: me.logoUrl || '',
          branches: (me.branches || []).map((b: any) => ({
            code: b.code || '00000',
            name: b.nameTh || 'สาขา',
          })),
        };
        console.log('OrgService: Final SellerProfile:', profile);
        return profile;
      })
    );
  }
}