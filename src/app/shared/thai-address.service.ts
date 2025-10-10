// src/app/shared/thai-address.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of } from 'rxjs';

export interface TAItem {
  code: string;
  name_th: string;
  zip?: string;
  parent_district_code?: string;
  parent_district_name?: string;
  parent_province_code?: string;
  parent_province_name?: string;
}

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

export interface ZipLookupResult {
  province: TAItem;
  district: TAItem;
  subdistrict: TAItem;
}

@Injectable({ providedIn: 'root' })
export class ThaiAddressService {
  private base = 'assets/thai';

  constructor(private http: HttpClient) {}

  /** โหลดจังหวัดทั้งหมด */
  getProvinces(): Observable<Province[]> {
    return this.http.get<Province[]>(`${this.base}/provinces.json`);
  }

  /** (ภายใน) โหลดอำเภอทั้งหมด */
  private getAllDistricts(): Observable<District[]> {
    return this.http.get<District[]>(`${this.base}/districts.json`);
  }

  /** (ภายใน) โหลดตำบลทั้งหมด */
  private getAllSubdistricts(): Observable<Subdistrict[]> {
    return this.http.get<Subdistrict[]>(`${this.base}/subdistricts.json`);
  }

  /** อำเภอตามจังหวัด */
  getDistricts(provinceCode: string): Observable<TAItem[]> {
    if (!provinceCode) return of([]);
    return this.getAllDistricts().pipe(
      map((districts) =>
        districts
          .filter((d) => d.parent_code === provinceCode)
          .map<TAItem>((d) => ({ code: d.code, name_th: d.name_th }))
      )
    );
  }

  /** ตำบลตามอำเภอ */
  getSubdistricts(districtCode: string): Observable<TAItem[]> {
    if (!districtCode) return of([]);
    return this.getAllSubdistricts().pipe(
      map((subs) =>
        subs
          .filter((s) => s.parent_code === districtCode)
          .map<TAItem>((s) => ({
            code: s.code,
            name_th: s.name_th,
            zip: s.zip,
          }))
      )
    );
  }

  /**
   * ค้นหาจาก ZIP → คืน Province/District/Subdistrict
   * ลำดับความสัมพันธ์:
   *   subdistrict.zip === zip
   *   subdistrict.parent_code -> district.code
   *   district.parent_code -> province.code
   */
  lookupByZip(zip: string): Observable<ZipLookupResult | null> {
    const z = (zip || '').trim();
    if (!/^\d{5}$/.test(z)) return of(null);

    return forkJoin({
      provinces: this.getProvinces(),
      districts: this.getAllDistricts(),
      subdistricts: this.getAllSubdistricts(),
    }).pipe(
      map(({ provinces, districts, subdistricts }) => {
        const sub = subdistricts.find((s) => s.zip === z);
        if (!sub) return null;

        const dist = districts.find((d) => d.code === sub.parent_code);
        if (!dist) return null;

        const prov = provinces.find((p) => p.code === dist.parent_code);
        if (!prov) return null;

        const subdistrictItem: TAItem = {
          code: sub.code,
          name_th: sub.name_th,
          zip: sub.zip,
          parent_district_code: dist.code,
          parent_district_name: dist.name_th,
          parent_province_code: prov.code,
          parent_province_name: prov.name_th,
        };

        const districtItem: TAItem = {
          code: dist.code,
          name_th: dist.name_th,
          parent_province_code: prov.code,
          parent_province_name: prov.name_th,
        };

        const provinceItem: TAItem = {
          code: prov.code,
          name_th: prov.name_th,
        };

        return {
          province: provinceItem,
          district: districtItem,
          subdistrict: subdistrictItem,
        } as ZipLookupResult;
      })
    );
  }
}
