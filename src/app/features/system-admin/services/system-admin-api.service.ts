import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SystemSummary {
  totalTenants: number;
  totalUsers: number;
  totalBranches: number;
  activeUsers: number;
  lockedUsers: number;
  loginSuccess24h: number;
  loginFailed24h: number;
  refreshDenied24h: number;
  topErrors: { errorCode: string; count: number }[];
}

export interface Tenant {
  sellerId: string;
  sellerTaxId: string;
  companyName: string;
  contactEmail: string;
  branchCount: number;
  userCount: number;
  documentCount: number;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface TenantPage {
  content: Tenant[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AuditLog {
  userName: string;
  action: string;
  activityCategory: string;
  status: string;
  traceId: string;
  ipAddress: string;
  userAgent: string;
  httpStatus: number;
  errorCode: string;
  createdAt: string;
}

export interface AuditLogPage {
  content: AuditLog[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AuthSecurityStats {
  topFailedUsernames: { username: string; failedCount: number; lastAttempt: string }[];
  topFailedIps: { ipAddress: string; attemptCount: number; lastAttempt: string }[];
  recentLockouts: { username: string; lockedAt: string; failedAttempts: number }[];
  refreshDeniedCount: number;
  tokenReuseCount: number;
  totalFailedAttempts: number;
}

export interface RoleWithCount {
  roleId: string;
  roleCode: string;
  roleName: string;
  description: string;
  userCount: number;
  isSystemRole: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SystemAdminApiService {
  private baseUrl = `${environment.apiBase}/system`;

  constructor(private http: HttpClient) {}

  getSummary(): Observable<SystemSummary> {
    return this.http.get<SystemSummary>(`${this.baseUrl}/summary`);
  }

  getTenants(params?: {
    query?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }): Observable<TenantPage> {
    let httpParams = new HttpParams();
    if (params?.query) httpParams = httpParams.set('query', params.query);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.from) httpParams = httpParams.set('from', params.from);
    if (params?.to) httpParams = httpParams.set('to', params.to);
    if (params?.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params?.size) httpParams = httpParams.set('size', params.size.toString());
    
    return this.http.get<TenantPage>(`${this.baseUrl}/tenants`, { params: httpParams });
  }

  updateTenantStatus(sellerId: string, action: 'ACTIVATE' | 'SUSPEND', reason?: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/tenants/${sellerId}/status`, { action, reason });
  }

  getAuditLogs(params?: {
    query?: string;
    category?: string;
    status?: string;
    sellerId?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }): Observable<AuditLogPage> {
    let httpParams = new HttpParams();
    if (params?.query) httpParams = httpParams.set('query', params.query);
    if (params?.category) httpParams = httpParams.set('category', params.category);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.sellerId) httpParams = httpParams.set('sellerId', params.sellerId);
    if (params?.from) httpParams = httpParams.set('from', params.from);
    if (params?.to) httpParams = httpParams.set('to', params.to);
    if (params?.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params?.size) httpParams = httpParams.set('size', params.size.toString());
    
    return this.http.get<AuditLogPage>(`${this.baseUrl}/audit`, { params: httpParams });
  }

  getAuthSecurityStats(from?: string, to?: string): Observable<AuthSecurityStats> {
    let httpParams = new HttpParams();
    if (from) httpParams = httpParams.set('from', from);
    if (to) httpParams = httpParams.set('to', to);
    
    return this.http.get<AuthSecurityStats>(`${this.baseUrl}/auth-security`, { params: httpParams });
  }

  getRoles(): Observable<RoleWithCount[]> {
    return this.http.get<RoleWithCount[]>(`${this.baseUrl}/roles`);
  }

  // New methods for System Admin Dashboard Enhancement
  getTenantDropdown(): Observable<TenantDropdown[]> {
    return this.http.get<TenantDropdown[]>(`${this.baseUrl}/tenants/dropdown`);
  }

  getTenantBranches(sellerId: string): Observable<BranchDropdown[]> {
    return this.http.get<BranchDropdown[]>(`${this.baseUrl}/tenants/${sellerId}/branches`);
  }

  getDashboardStats(sellerId?: string, branchId?: string): Observable<TenantDashboardStats> {
    let httpParams = new HttpParams();
    if (sellerId) httpParams = httpParams.set('sellerId', sellerId);
    if (branchId) httpParams = httpParams.set('branchId', branchId);
    
    return this.http.get<TenantDashboardStats>(`${this.baseUrl}/dashboard/stats`, { params: httpParams });
  }
}

// New interfaces
export interface TenantDropdown {
  sellerId: string;
  sellerTaxId: string;
  companyName: string;
  status: string;
}

export interface BranchDropdown {
  branchId: string;
  branchCode: string;
  branchName: string;
}

export interface TenantDashboardStats {
  totalDocuments: number;
  submittedToEtax: number;
  pendingSubmission: number;
  cancelledDocuments: number;
  documentTypeBreakdown: DocumentTypeCount[];
}

export interface DocumentTypeCount {
  docTypeCode: string;
  docTypeName: string;
  count: number;
  percentage: number;
}
