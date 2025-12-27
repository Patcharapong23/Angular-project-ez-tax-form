import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, shareReplay, tap, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';

export interface BranchListItem {
  branchId: string;
  branchCode: string;
  branchNameTh: string;
  branchNameEn?: string;
  addressDetailTh?: string;
  createDate?: string;
  updateDate?: string;
  enableFlag?: boolean | string; // Allow string 'Y'/'N' for conversion
}

export interface BranchDto {
  branchId?: string;
  branchCode: string;
  branchNameTh: string;
  branchNameEn?: string;
  addressDetailTh?: string;
  buildingNo?: string;
  subdistrictId?: string;
  districtId?: string;
  provinceId?: string;
  zipCode?: string;
  addressDetailEn?: string;
  logoUrl?: string;
  logoPublicId?: string;
  countryId?: string;
  enableFlag?: string; // Y/N
  sellerTaxId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BranchService {
  private apiUrl = `${environment.apiBase}/branches`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private branchesCache$: Observable<BranchListItem[]> | null = null;

  getBranches(): Observable<BranchListItem[]> {
    if (this.branchesCache$) {
      return this.branchesCache$;
    }

    const user = this.authService.currentUser;
    // If no sellerTaxId (e.g. SYSTEM_ADMIN or error), return empty list instead of throwing
    // to allow other forkJoin requests (like Roles) to succeed.
    if (!user?.sellerTaxId) {
      console.warn('BranchService: No sellerTaxId found, returning empty branch list.');
      return of([]);
    }

    const headers = new HttpHeaders({
      'X-Seller-Tax-Id': user.sellerTaxId
    });

    this.branchesCache$ = this.http.get<BranchListItem[]>(this.apiUrl, { headers }).pipe(
      shareReplay(1)
    );

    return this.branchesCache$;
  }

  getBranchById(branchId: string): Observable<BranchDto> {
    const user = this.authService.currentUser;
    if (!user?.sellerTaxId) {
      throw new Error('No seller tax ID available');
    }

    const headers = new HttpHeaders({
      'X-Seller-Tax-Id': user.sellerTaxId
    });

    return this.http.get<BranchDto>(`${this.apiUrl}/${branchId}`, { headers });
  }

  createBranch(branch: BranchDto): Observable<BranchDto> {
    const user = this.authService.currentUser;
    if (!user?.sellerTaxId) {
      throw new Error('No seller tax ID available');
    }
    const headers = new HttpHeaders({
      'X-Seller-Tax-Id': user.sellerTaxId
    });
    // Set sellerTaxId implicitly or explicitly
    branch.sellerTaxId = user.sellerTaxId;
    
    return this.http.post<BranchDto>(this.apiUrl, branch, { headers }).pipe(
      tap(() => this.branchesCache$ = null)
    );
  }

  updateBranch(branchId: string, branch: BranchDto): Observable<BranchDto> {
    const user = this.authService.currentUser;
    if (!user?.sellerTaxId) {
      throw new Error('No seller tax ID available');
    }
    const headers = new HttpHeaders({
      'X-Seller-Tax-Id': user.sellerTaxId
    });
    branch.sellerTaxId = user.sellerTaxId;

    return this.http.put<BranchDto>(`${this.apiUrl}/${branchId}`, branch, { headers }).pipe(
      tap(() => this.branchesCache$ = null)
    );
  }
}
