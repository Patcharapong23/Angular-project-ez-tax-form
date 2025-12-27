// src/app/shared/services/product.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Product {
  id: string;
  name: string;
  productCode: string;
  unit: string;
  description: string;
  taxType: string;
  taxRate: number;
  defaultPrice: number;
  vatType?: 'include' | 'exclude';
  createDate: Date;
  status: 'ACTIVE' | 'INACTIVE';
  updateDate: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private api = `${environment.apiBase}/products`;
  
  // Cache storage
  private productsCache: Product[] | null = null;
  private productsRequest$: Observable<Product[]> | null = null;
  
  // Units cache
  private unitsCache: string[] | null = null;
  private unitsRequest$: Observable<string[]> | null = null;

  constructor(private http: HttpClient) { }

  /**
   * Get products with caching
   */
  getProducts(sortBy?: string, sortDir?: string): Observable<Product[]> {
    if (sortBy) {
        let params = new HttpParams().set('sortBy', sortBy);
        if (sortDir) params = params.set('sortDir', sortDir);
        return this.http.get<Product[]>(this.api, { params });
    }

    if (this.productsCache) {
      return of(this.productsCache);
    }
    
    if (!this.productsRequest$) {
      this.productsRequest$ = this.http.get<Product[]>(this.api).pipe(
        tap(products => {
          this.productsCache = products;
          this.productsRequest$ = null;
        }),
        shareReplay(1)
      );
    }
    
    return this.productsRequest$;
  }

  /**
   * Force refresh products from API
   */
  refreshProducts(): Observable<Product[]> {
    this.clearCache();
    return this.getProducts();
  }

  /**
   * Clear all cache (call after create/update/delete)
   */
  clearCache(): void {
    this.productsCache = null;
    this.productsRequest$ = null;
    this.unitsCache = null;
    this.unitsRequest$ = null;
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.api}/${id}`);
  }

  createProduct(product: Omit<Product, 'id'>): Observable<Product> {
    return this.http.post<Product>(this.api, product).pipe(
      tap(() => this.clearCache())
    );
  }

  updateProduct(id: string, product: Partial<Product>): Observable<any> {
    return this.http.put(`${this.api}/${id}`, product).pipe(
      tap(() => this.clearCache())
    );
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.api}/${id}`).pipe(
      tap(() => this.clearCache())
    );
  }

  /**
   * Get distinct product units with caching
   */
  getUnits(): Observable<string[]> {
    // Return cached data if available
    if (this.unitsCache) {
      return of(this.unitsCache);
    }
    
    // Share the same request if one is in-flight
    if (!this.unitsRequest$) {
      this.unitsRequest$ = this.http.get<string[]>(`${this.api}/units`).pipe(
        tap(units => {
          this.unitsCache = units;
          this.unitsRequest$ = null;
        }),
        shareReplay(1)
      );
    }
    
    return this.unitsRequest$;
  }
}
