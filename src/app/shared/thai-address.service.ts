// src/app/shared/thai-address.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TAItem {
  code: string;
  name_th: string;
  zip?: string;
}

@Injectable({ providedIn: 'root' })
export class ThaiAddressService {
  private base = 'assets/thai';

  constructor(private http: HttpClient) {}

  // โหลดจังหวัดทั้งหมด
  getProvinces(): Observable<TAItem[]> {
    return this.http.get<TAItem[]>(`${this.base}/provinces.json`);
  }

  // โหลดอำเภอตาม provinceCode
  getDistricts(provinceCode: string): Observable<TAItem[]> {
    return this.http
      .get<TAItem[]>(`${this.base}/districts.json`)
      .pipe
      // ถ้า districts.json เก็บแบบ array ใหญ่ → filter ตาม provinceCode
      // ถ้าเก็บแบบ { "10": [ {...}, {...} ] } → แก้เป็น map object[provinceCode]
      ();
  }

  // โหลดตำบลตาม districtCode
  getSubdistricts(districtCode: string): Observable<TAItem[]> {
    return this.http.get<TAItem[]>(`${this.base}/subdistricts.json`).pipe();
  }
}
