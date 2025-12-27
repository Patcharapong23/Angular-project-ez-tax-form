import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// =====================================================
// DTOs matching backend
// =====================================================

export interface RoleListDto {
  roleId: string;
  roleCode: string;
  roleName: string;
  roleLevel: string;
  enableFlag: string;
  createDate: string;
  updateDate: string;
  createBy: string;
  updateBy: string;
}

export interface RoleListResponse {
  content: RoleListDto[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface MenuPermissionDto {
  menuCode: string;
  permissions: string[];  // ['VIEW', 'ADD', 'EDIT', 'DUP', 'CANCEL', 'DELETE']
}

export interface RoleDetailResponse {
  roleId: string;
  roleCode: string;
  roleName: string;
  roleLevel: string;
  sellerId?: string;
  enableFlag: string;
  createBy?: string;
  createDate?: string;
  updateBy?: string;
  updateDate?: string;
  menuPermissions: MenuPermissionDto[];
}

export interface RoleWithPermissionsRequest {
  roleCode: string;
  roleName: string;
  roleLevel: string;
  sellerId?: string;
  enableFlag: string;
  menuPermissions: MenuPermissionDto[];
}

// =====================================================
// Role Service with full CRUD
// =====================================================

@Injectable({
  providedIn: 'root'
})
export class RoleService {

  private apiUrl = `${environment.apiBase}/roles`;

  constructor(private http: HttpClient) { }

  // List roles (paginated)
  getRoles(search: string = '', page: number = 0, size: number = 10): Observable<RoleListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<RoleListResponse>(this.apiUrl, { params });
  }

  // Get role detail with permissions
  getRoleDetail(roleId: string): Observable<RoleDetailResponse> {
    return this.http.get<RoleDetailResponse>(`${this.apiUrl}/${roleId}`);
  }

  // Create new role with permissions
  createRole(request: RoleWithPermissionsRequest): Observable<any> {
    return this.http.post(this.apiUrl, request);
  }

  // Update existing role with permissions
  updateRole(roleId: string, request: RoleWithPermissionsRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/${roleId}`, request);
  }

  // Delete role
  deleteRole(roleId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${roleId}`);
  }
}
