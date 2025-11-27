// src/app/shared/thai-address.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

export interface Province {
  code: string;
  name_th: string;
}

export interface District {
  code: string;
  name_th: string;
  parent_code: string; // = รหัสจังหวัด
}

export interface Subdistrict {
  code: string;
  name_th: string;
  parent_code: string; // = รหัสอำเภอ
  zip?: string;
}

@Injectable({ providedIn: 'root' })
export class ThaiAddressService {
  private base = `${environment.apiBase}/thai-geo`;

  constructor(private http: HttpClient) {}

  /** โหลดจังหวัดทั้งหมด */
  getProvinces(): Observable<Province[]> {
    return this.http.get<Province[]>(`${this.base}/provinces`);
  }

  /** อำเภอตามจังหวัด */
  getDistricts(provinceCode: string): Observable<District[]> {
    if (!provinceCode) return of([]);
    return this.http.get<District[]>(`${this.base}/provinces/${provinceCode}/districts`);
  }

  /** ตำบลตามอำเภอ */
  getSubdistricts(districtCode: string): Observable<Subdistrict[]> {
    if (!districtCode) return of([]);
    return this.http.get<Subdistrict[]>(`${this.base}/districts/${districtCode}/subdistricts`);
  }
}
