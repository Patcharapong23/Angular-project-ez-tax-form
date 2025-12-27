import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DashboardSummary } from '../models/dashboard.models';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private base = environment.apiBase;
  private cache = new Map<string, Observable<DashboardSummary>>();

  constructor(private http: HttpClient) { }

  getDashboardSummary(period: string = 'weekly', forceRefresh: boolean = false): Observable<DashboardSummary> {
    if (!this.cache.has(period) || forceRefresh) {
      const params = new HttpParams().set('period', period);
      const obs = this.http.get<DashboardSummary>(`${this.base}/dashboard/summary`, { params }).pipe(
        shareReplay(1)
      );
      this.cache.set(period, obs);
    }
    return this.cache.get(period)!;
  }

  getSyncData(period: string = 'weekly', sellerTaxId?: string, branchId?: string): Observable<any> {
    let params = new HttpParams().set('period', period);
    if (sellerTaxId) params = params.set('sellerTaxId', sellerTaxId);
    if (branchId) params = params.set('branchId', branchId);
    
    return this.http.get<any>(`${this.base}/dashboard/sync`, { params });
  }
}
