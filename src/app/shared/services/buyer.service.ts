// src/app/shared/services/buyer.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Buyer {
  id: number | string;
  taxId: string;
  name: string;
  address: string;
  zipCode?: string;
  branch: string;
  email: string;
  telephone: string;
  code?: string;
  createDate?: string;
  updateDate?: string;
  status?: string;
  taxpayerType?: string; // e.g. 'PERSON', 'JURISTIC', 'FOREIGN'
}

@Injectable({
  providedIn: 'root'
})
export class BuyerService {
  private api = `${environment.apiBase}/buyers`;
  
  // Cache storage
  private buyersCache: Buyer[] | null = null;
  private buyersRequest$: Observable<Buyer[]> | null = null;

  constructor(private http: HttpClient) { }

  /**
   * Get buyers with caching
   * - First call: fetches from API and caches
   * - Subsequent calls: returns cached data
   * - Use refreshBuyers() to force refresh
   */
  getBuyers(): Observable<Buyer[]> {
    // Return cached data if available
    if (this.buyersCache) {
      return of(this.buyersCache);
    }
    
    // Share the same request if one is in-flight
    if (!this.buyersRequest$) {
      this.buyersRequest$ = this.http.get<Buyer[]>(this.api).pipe(
        tap(buyers => {
          this.buyersCache = buyers;
          this.buyersRequest$ = null;
        }),
        shareReplay(1)
      );
    }
    
    return this.buyersRequest$;
  }

  /**
   * Force refresh buyers from API
   */
  refreshBuyers(): Observable<Buyer[]> {
    this.clearCache();
    return this.getBuyers();
  }

  /**
   * Clear the cache (call after create/update/delete)
   */
  clearCache(): void {
    this.buyersCache = null;
    this.buyersRequest$ = null;
  }

  getBuyer(id: number | string): Observable<Buyer> {
    return this.http.get<Buyer>(`${this.api}/${id}`);
  }

  createBuyer(buyer: Omit<Buyer, 'id'>): Observable<Buyer> {
    return this.http.post<Buyer>(this.api, buyer).pipe(
      tap(() => this.clearCache()) // Clear cache on create
    );
  }

  updateBuyer(id: number | string, buyer: Partial<Buyer>): Observable<any> {
    return this.http.put(`${this.api}/${id}`, buyer).pipe(
      tap(() => this.clearCache()) // Clear cache on update
    );
  }

  deleteBuyer(id: number | string): Observable<any> {
    return this.http.delete(`${this.api}/${id}`).pipe(
      tap(() => this.clearCache()) // Clear cache on delete
    );
  }
}
