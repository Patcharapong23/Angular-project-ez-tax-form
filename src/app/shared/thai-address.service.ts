// src/app/shared/thai-address.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

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
  // Use local JSON assets instead of backend API
  private basePath = 'assets/thai';

  // Cache variables
  private provinces$: Observable<Province[]> | null = null;
  private districts$: Observable<District[]> | null = null;
  private subdistricts$: Observable<Subdistrict[]> | null = null;

  constructor(private http: HttpClient) {}

  /** โหลดจังหวัดทั้งหมด */
  getProvinces(): Observable<Province[]> {
    if (!this.provinces$) {
      this.provinces$ = this.http.get<Province[]>(`${this.basePath}/provinces.json`).pipe(
        shareReplay(1)
      );
    }
    return this.provinces$;
  }

  /** อำเภอตามจังหวัด */
  getDistricts(provinceCode: string): Observable<District[]> {
    if (!provinceCode) return of([]);
    
    if (!this.districts$) {
      this.districts$ = this.http.get<District[]>(`${this.basePath}/districts.json`).pipe(
        shareReplay(1)
      );
    }

    return this.districts$.pipe(
      map(districts => districts.filter(d => d.parent_code === provinceCode))
    );
  }

  /** ตำบลตามอำเภอ */
  getSubdistricts(districtCode: string): Observable<Subdistrict[]> {
    if (!districtCode) return of([]);

    if (!this.subdistricts$) {
      this.subdistricts$ = this.http.get<Subdistrict[]>(`${this.basePath}/subdistricts.json`).pipe(
        shareReplay(1)
      );
    }

    return this.subdistricts$.pipe(
      map(subdistricts => subdistricts.filter(s => s.parent_code === districtCode))
    );
  }
}
