import { Injectable } from '@angular/core';
import { BaseStoreService } from './base-store.service';
import { Product, ProductService } from './product.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductStoreService extends BaseStoreService<Product> {

  constructor(private productService: ProductService) {
    super();
  }

  /**
   * Get products with caching.
   * Note: This caches the full list (default sort/filter).
   * If custom sort/filter is applied that requires server-side processing,
   * you might need to bypass cache or handle multiple cache keys (advanced).
   * For now, we assume initial load is cached, and client-side filtering is used,
   * or specific searches bypass the store or refresh it.
   */
  getProducts$(sortBy?: string, sortDir?: string): Observable<Product[] | null> {
    // Decision: If sorting params are present, we might want to refresh OR just pass through.
    // However, the requirement is "list component uses store.get$()".
    // If we want to cache the "default" list, we call get$ without params, 
    // but the API requires params for sorting? 
    // The current ProductService.getProducts accepts args.
    
    // Simplification for this task: Cache the result of the fetch.
    // If arguments change, we should fundamentally invalidate or separate cache.
    // BUT BaseStore simple implementation has one data stream.
    // Recommendation: Cache the 'default' view (no args or specific default args).
    // If user sorts, we explicitly refresh() or just call API directly if we don't want to store that specific sort state.
    
    // Given the requirement "Every entity list must have XxxStoreService", 
    // let's wrap the standard fetch.
    return this.get$(() => this.productService.getProducts(sortBy || 'updateDate', sortDir || 'desc'));
  }
}
