import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  DocumentListItem,
  EzDocumentFull,
  CreateDocumentRequest,
  CreateDocumentResponse,
  DocumentSearchParams, // New
  Page, // New
  DocumentDto, // New
  UpdateDocumentRequest, // New
} from '../../shared/models/document.models';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly base = `${environment.apiBase}/documents`;
  
  // Cache storage - keyed by JSON representation of params
  private listCache: Map<string, Page<DocumentListItem>> = new Map();
  private listRequests: Map<string, Observable<Page<DocumentListItem>>> = new Map();
  
  constructor(private http: HttpClient) {}

  private getCacheKey(params?: DocumentSearchParams): string {
    return JSON.stringify(params || {});
  }

  list(params?: DocumentSearchParams): Observable<Page<DocumentListItem>> {
    const cacheKey = this.getCacheKey(params);
    
    // Return cached data if available
    if (this.listCache.has(cacheKey)) {
      return of(this.listCache.get(cacheKey)!);
    }
    
    // Share the same request if one is in-flight
    if (!this.listRequests.has(cacheKey)) {
      let httpParams = new HttpParams();
      if (params?.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params?.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
      if (params?.docType) httpParams = httpParams.set('docType', params.docType);
      if (params?.buyerTaxId) httpParams = httpParams.set('buyerTaxId', params.buyerTaxId);
      if (params?.issueDateFrom) httpParams = httpParams.set('issueDateFrom', params.issueDateFrom);
      if (params?.issueDateTo) httpParams = httpParams.set('issueDateTo', params.issueDateTo);
      if (params?.createdFrom) httpParams = httpParams.set('createdFrom', params.createdFrom);
      if (params?.createdTo) httpParams = httpParams.set('createdTo', params.createdTo);
      if (params?.status) httpParams = httpParams.set('status', params.status);
      
      const request$ = this.http.get<Page<DocumentListItem>>(this.base, { params: httpParams }).pipe(
        tap(data => {
          this.listCache.set(cacheKey, data);
          this.listRequests.delete(cacheKey);
        }),
        shareReplay(1)
      );
      
      this.listRequests.set(cacheKey, request$);
    }
    
    return this.listRequests.get(cacheKey)!;
  }

  /**
   * Force refresh documents list
   */
  refreshList(params?: DocumentSearchParams): Observable<Page<DocumentListItem>> {
    const cacheKey = this.getCacheKey(params);
    this.listCache.delete(cacheKey);
    this.listRequests.delete(cacheKey);
    return this.list(params);
  }

  /**
   * Clear all cache (call after create/update/delete)
   */
  clearCache(): void {
    this.listCache.clear();
    this.listRequests.clear();
  }

  createDocument(payload: CreateDocumentRequest): Observable<CreateDocumentResponse> {
    return this.http.post<CreateDocumentResponse>(this.base, payload).pipe(
      tap(() => this.clearCache())
    );
  }

  get(id: number): Observable<EzDocumentFull> {
    return this.http.get<EzDocumentFull>(`${this.base}/${id}`);
  }

  // ✅ ใหม่: ดึงด้วยเลขที่เอกสาร
  getByDocNo(docNo: string): Observable<EzDocumentFull> {
    return this.http.get<EzDocumentFull>(
      `${this.base}/by-no/${encodeURIComponent(docNo)}`
    );
  }
  getByDocNoDetail(docNo: string) {
    // ตัวอย่าง: API ที่คืนรายละเอียดเต็มของเอกสารจากเลขที่เอกสาร
    return this.http.get<any>(
      `${this.base}/by-no/${encodeURIComponent(docNo)}`
    );
  }

  getDocumentByUuid(docUuid: string): Observable<DocumentDto> {
    return this.http.get<DocumentDto>(`${this.base}/${docUuid}`);
  }

  updateDocument(docUuid: string, payload: UpdateDocumentRequest): Observable<DocumentDto> {
    return this.http.put<DocumentDto>(`${this.base}/${docUuid}`, payload).pipe(
      tap(() => this.clearCache())
    );
  }

  cancel(docUuid: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${docUuid}/cancel`, {}).pipe(
      tap(() => this.clearCache())
    );
  }

  delete(docUuid: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${docUuid}`).pipe(
      tap(() => this.clearCache())
    );
  }

  exportDocument(docUuid: string, type: 'pdf' | 'xml' | 'csv'): Observable<Blob> {
    const params = new HttpParams().set('type', type);
    return this.http.get(
      `${this.base}/${docUuid}/export`,
      { params, responseType: 'blob' }
    );
  }

  preview(type: string, branch: string, sellerTaxId: string, date: string): Observable<{ docNo: string }> {
    const url =
      `${this.base}/preview?` +
      `type=${encodeURIComponent(type)}` +
      `&branch=${encodeURIComponent(branch)}` +
      `&sellerTaxId=${encodeURIComponent(sellerTaxId)}` +
      `&date=${encodeURIComponent(date)}`;

    return this.http.get<{ docNo:string }>(url);
  }
}

