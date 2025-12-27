import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, shareReplay } from 'rxjs';

export interface Province {
  code: string;
  name_th: string;
  name_en: string;
}

export interface District {
  code: string;
  name_th: string;
  name_en: string;
  province_code: string;
}

export interface Subdistrict {
  code: string;
  name_th: string;
  name_en: string;
  district_code: string;
  zip_code: string;
}

/**
 * Lazy-loading service for Thai address data.
 * Data is loaded ONLY when needed (e.g., address input forms).
 * Results are cached to avoid duplicate requests.
 */
@Injectable({
  providedIn: 'root'
})
export class ThaiAddressDataService {
  // Cached observables (with shareReplay to prevent duplicate requests)
  private provinces$?: Observable<Province[]>;
  private districts$?: Observable<District[]>;
  private subdistricts$?: Observable<Subdistrict[]>;
  
  // Loaded data for synchronous access
  private _provinces: Province[] = [];
  private _districts: District[] = [];
  private _subdistricts: Subdistrict[] = [];
  
  private _loaded = false;

  constructor(private http: HttpClient) {}

  /**
   * Check if data has been loaded
   */
  get isLoaded(): boolean {
    return this._loaded;
  }

  /**
   * Get provinces (synchronous, returns cached data)
   */
  get provinces(): Province[] {
    return this._provinces;
  }

  /**
   * Get districts (synchronous, returns cached data)
   */
  get districts(): District[] {
    return this._districts;
  }

  /**
   * Get subdistricts (synchronous, returns cached data)
   */
  get subdistricts(): Subdistrict[] {
    return this._subdistricts;
  }

  /**
   * Load all address data (lazy - call only when entering address forms)
   * Returns immediately if already loaded
   */
  loadAll(): Observable<boolean> {
    if (this._loaded) {
      return of(true);
    }

    // Load all 3 files in parallel
    return new Observable<boolean>(observer => {
      Promise.all([
        this.getProvinces$().toPromise(),
        this.getDistricts$().toPromise(),
        this.getSubdistricts$().toPromise()
      ]).then(() => {
        this._loaded = true;
        observer.next(true);
        observer.complete();
      }).catch(err => {
        console.error('Failed to load Thai address data:', err);
        observer.error(err);
      });
    });
  }

  /**
   * Get provinces observable (with caching)
   */
  getProvinces$(): Observable<Province[]> {
    if (!this.provinces$) {
      this.provinces$ = this.http.get<Province[]>('assets/thai/provinces.json').pipe(
        tap(data => this._provinces = data),
        shareReplay(1)
      );
    }
    return this.provinces$;
  }

  /**
   * Get districts observable (with caching)
   */
  getDistricts$(): Observable<District[]> {
    if (!this.districts$) {
      this.districts$ = this.http.get<District[]>('assets/thai/districts.json').pipe(
        tap(data => this._districts = data),
        shareReplay(1)
      );
    }
    return this.districts$;
  }

  /**
   * Get subdistricts observable (with caching)
   */
  getSubdistricts$(): Observable<Subdistrict[]> {
    if (!this.subdistricts$) {
      this.subdistricts$ = this.http.get<Subdistrict[]>('assets/thai/subdistricts.json').pipe(
        tap(data => this._subdistricts = data),
        shareReplay(1)
      );
    }
    return this.subdistricts$;
  }

  /**
   * Get districts by province code
   */
  getDistrictsByProvince(provinceCode: string): District[] {
    return this._districts.filter(d => d.province_code === provinceCode);
  }

  /**
   * Get subdistricts by district code
   */
  getSubdistrictsByDistrict(districtCode: string): Subdistrict[] {
    return this._subdistricts.filter(s => s.district_code === districtCode);
  }

  /**
   * Find province by code
   */
  findProvince(code: string): Province | undefined {
    return this._provinces.find(p => p.code === code);
  }

  /**
   * Find district by code
   */
  findDistrict(code: string): District | undefined {
    return this._districts.find(d => d.code === code);
  }

  /**
   * Find subdistrict by code
   */
  findSubdistrict(code: string): Subdistrict | undefined {
    return this._subdistricts.find(s => s.code === code);
  }
}
