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
  
  // Cache for recent documents (used by dashboard)
  private recentDocsCache$: Observable<Page<DocumentListItem>> | null = null;
  private recentDocsCacheKey: string = '';
  
  constructor(private http: HttpClient) {}

  list(params?: DocumentSearchParams): Observable<Page<DocumentListItem>> {
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
    if (params?.docNo) httpParams = httpParams.set('docNo', params.docNo);
    if (params?.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params?.sortDir) httpParams = httpParams.set('sortDir', params.sortDir);
    
    return this.http.get<Page<DocumentListItem>>(this.base, { params: httpParams });
  }

  // Cached version for dashboard recent documents (prevents duplicate calls)
  listRecentForDashboard(): Observable<Page<DocumentListItem>> {
    const cacheKey = 'recent-dashboard';
    if (!this.recentDocsCache$ || this.recentDocsCacheKey !== cacheKey) {
      this.recentDocsCacheKey = cacheKey;
      this.recentDocsCache$ = this.http.get<Page<DocumentListItem>>(this.base, { 
        params: new HttpParams()
          .set('page', '0')
          .set('size', '20')
          .set('sortBy', 'createdAt')
          .set('sortDir', 'desc')
      }).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.recentDocsCache$;
  }

  // Clear cache (call after document create/update/delete)
  clearRecentDocsCache(): void {
    this.recentDocsCache$ = null;
    this.recentDocsCacheKey = '';
  }

  createDocument(payload: CreateDocumentRequest): Observable<CreateDocumentResponse> {
    return this.http.post<CreateDocumentResponse>(this.base, payload);
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
    return this.http.put<DocumentDto>(`${this.base}/${docUuid}`, payload);
  }

  cancel(docUuid: string, reason: string, cancelledBy: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${docUuid}/cancel`, { reason, cancelledBy });
  }

  delete(docUuid: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${docUuid}`);
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

