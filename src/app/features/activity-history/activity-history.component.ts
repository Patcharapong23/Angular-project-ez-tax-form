import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '../../../environments/environment';
import { ActivityService, ActivityLogDto, Activity, ActivityAction, ActivityEntity } from '../../shared/services/activity.service';
import { AuthService } from '../../shared/auth.service';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { ActivityDetailDialogComponent, ActivityDetailData } from './activity-detail-dialog/activity-detail-dialog.component';

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

interface ActivityDisplay {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  userId: string;
  userName: string;
  status: string;
  activityCategory: string;
  createdAt: Date;
  // Audit trail fields
  userRole?: string;
  sellerName?: string;
  branchName?: string;
  ipAddress?: string;
  device?: string;
  userAgent?: string;
  httpStatus?: number;
  errorCode?: string;
  errorMessage?: string;
}

interface StatusOption {
  name: string;
  value: string;
}

@Component({
  selector: 'app-activity-history',
  templateUrl: './activity-history.component.html',
  styleUrls: ['./activity-history.component.css']
})
export class ActivityHistoryComponent implements OnInit, OnDestroy {
  activities: ActivityDisplay[] = [];
  loading = false;
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;

  // User role
  userRole: string = 'STAFF';

  // Form
  searchForm!: FormGroup;
  
  // Dropdown state
  opened: { [key: string]: boolean } = {};
  selectedStatus: StatusOption = { name: 'ทั้งหมด', value: '' };
  selectedRole: StatusOption = { name: 'ทั้งหมด', value: '' };
  selectedCategory: StatusOption = { name: 'ทั้งหมด', value: '' };
  showAdvancedFilters = false;
  hasSearched = false;

  // Status options (simplified for STAFF)
  statusOptions: StatusOption[] = [
    { name: 'ทั้งหมด', value: '' },
    { name: 'สำเร็จ', value: 'SUCCESS' },
    { name: 'ล้มเหลว', value: 'FAILED' }
  ];

  // Full status options (for BRANCH_ADMIN+)
  fullStatusOptions: StatusOption[] = [
    { name: 'ทั้งหมด', value: '' },
    { name: 'สำเร็จ', value: 'SUCCESS' },
    { name: 'ล้มเหลว', value: 'FAILED' },
    { name: 'ถูกปฏิเสธ', value: 'DENIED' }
  ];

  // Role options (SYSTEM_ADMIN only)
  roleOptions: StatusOption[] = [
    { name: 'ทั้งหมด', value: '' },
    { name: 'SYSTEM_ADMIN', value: 'SYSTEM_ADMIN' },
    { name: 'HQ_ADMIN', value: 'HQ_ADMIN' },
    { name: 'BRANCH_ADMIN', value: 'BRANCH_ADMIN' },
    { name: 'STAFF', value: 'STAFF' }
  ];

  // Category options (activity type)
  categoryOptions: StatusOption[] = [
    { name: 'ทั้งหมด', value: '' },
    { name: 'เอกสาร', value: 'Document' },
    { name: 'ข้อมูล', value: 'Data' },
    { name: 'เข้าสู่ระบบ', value: 'Login' },
    { name: 'จัดการระบบ', value: 'Admin' },
    { name: 'ตั้งค่า', value: 'Setting' },
    { name: 'เชื่อมต่อ', value: 'Integration' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    public activityService: ActivityService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadUserRole();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForm(): void {
    this.searchForm = this.fb.group({
      search: [''],
      searchUsername: [''],
      searchSeller: [''],
      searchBranch: [''],
      searchTransactionId: [''],
      searchIpAddress: [''],
      searchDevice: [''],
      dateRange: this.fb.group({
        start: [null],
        end: [null]
      })
    });
  }

  // Count active filters
  get activeFilterCount(): number {
    let count = 0;
    if (this.searchForm.get('searchUsername')?.value) count++;
    if (this.searchForm.get('searchSeller')?.value) count++;
    if (this.searchForm.get('searchBranch')?.value) count++;
    if (this.searchForm.get('searchTransactionId')?.value) count++;
    if (this.searchForm.get('searchIpAddress')?.value) count++;
    if (this.searchForm.get('searchDevice')?.value) count++;
    if (this.selectedRole.value) count++;
    if (this.selectedCategory.value) count++;
    if (this.selectedStatus.value) count++;
    return count;
  }

  selectRole(role: StatusOption): void {
    this.selectedRole = role;
    this.opened['role'] = false;
  }

  selectCategory(category: StatusOption): void {
    this.selectedCategory = category;
    this.opened['category'] = false;
  }

  loadUserRole(): void {
    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user && user.roles && user.roles.length > 0) {
        // Get primary role from roles array
        const primaryRole = user.roles[0] || '';
        console.log('User roles from auth:', user.roles);
        
        // Priority: SYSTEM_ADMIN > HQ_ADMIN > BRANCH_ADMIN > STAFF
        const role = primaryRole.toUpperCase();
        if (role.includes('SYSTEM_ADMIN') || role.includes('SYSTEMADMIN') || role === 'ADMIN') {
          this.userRole = 'SYSTEM_ADMIN';
        } else if (role.includes('HQ_ADMIN') || role.includes('HQADMIN')) {
          this.userRole = 'HQ_ADMIN';
        } else if (role.includes('BRANCH_ADMIN') || role.includes('BRANCHADMIN')) {
          this.userRole = 'BRANCH_ADMIN';
        } else {
          this.userRole = 'STAFF';
        }
        console.log('Detected userRole:', this.userRole);
      } else {
        console.log('No user roles found, defaulting to STAFF');
        this.userRole = 'STAFF';
      }
    });
  }

  // Get page title based on role
  get pageTitle(): string {
    return this.userRole === 'STAFF' 
      ? 'ประวัติการใช้งานของฉัน' 
      : 'ประวัติการทำรายการ';
  }

  // Check if user can see advanced filters
  get canShowAdvanced(): boolean {
    return this.userRole !== 'STAFF';
  }

  // Get status options based on role
  get currentStatusOptions(): StatusOption[] {
    return this.userRole === 'STAFF' ? this.statusOptions : this.fullStatusOptions;
  }

  get dateRangeText(): string {
    const dr = this.searchForm.get('dateRange')?.value;
    if (dr?.start && dr?.end) {
      const s = new Date(dr.start);
      const e = new Date(dr.end);
      return `${this.formatDateShort(s)} - ${this.formatDateShort(e)}`;
    }
    return '';
  }

  private formatDateShort(d: Date): string {
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  toggleDropdown(name: string): void {
    this.opened[name] = !this.opened[name];
  }

  selectStatus(s: StatusOption): void {
    this.selectedStatus = s;
    this.opened['status'] = false;
  }

  toggleAdvanced(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  loadActivities(): void {
    this.loading = true;
    
    let params = new HttpParams()
      .set('page', this.currentPage.toString())
      .set('size', this.pageSize.toString());

    const formVal = this.searchForm.value;
    
    // Use the main search field or username search
    const searchTerm = formVal.search?.trim() || formVal.searchUsername?.trim();
    if (searchTerm) {
      params = params.set('search', searchTerm);
    }
    
    if (formVal.dateRange?.start) {
      const s = new Date(formVal.dateRange.start);
      params = params.set('startDate', this.formatDateISO(s));
    }
    if (formVal.dateRange?.end) {
      const e = new Date(formVal.dateRange.end);
      params = params.set('endDate', this.formatDateISO(e));
    }
    
    // Add status filter
    if (this.selectedStatus.value) {
      params = params.set('status', this.selectedStatus.value);
    }

    // Advanced search filters (SYSTEM_ADMIN)
    if (formVal.searchSeller?.trim()) {
      params = params.set('sellerName', formVal.searchSeller.trim());
    }
    if (formVal.searchBranch?.trim()) {
      params = params.set('branchName', formVal.searchBranch.trim());
    }
    if (formVal.searchTransactionId?.trim()) {
      params = params.set('transactionId', formVal.searchTransactionId.trim());
    }
    if (formVal.searchIpAddress?.trim()) {
      params = params.set('ipAddress', formVal.searchIpAddress.trim());
    }
    if (formVal.searchDevice?.trim()) {
      params = params.set('device', formVal.searchDevice.trim());
    }
    
    // Dropdown filters
    if (this.selectedRole.value) {
      params = params.set('userRole', this.selectedRole.value);
    }
    if (this.selectedCategory.value) {
      params = params.set('category', this.selectedCategory.value);
    }

    const url = `${environment.apiBase}/activity/history`;
    
    this.http.get<{ success: boolean; data: PageResponse<any> }>(url, { params })
      .subscribe({
        next: (response) => {
          if (response.data) {
            const page = response.data;
            this.activities = (page.content || []).map((dto: any) => this.dtoToActivityDisplay(dto));
            this.totalPages = page.totalPages;
            this.totalElements = page.totalElements;
          } else {
            this.activities = [];
            this.totalPages = 0;
            this.totalElements = 0;
          }
          this.loading = false;
        },
        error: () => {
          this.activities = [];
          this.loading = false;
        }
      });
  }

  private formatDateISO(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  onSearch(): void {
    this.currentPage = 0;
    this.hasSearched = true;
    this.loadActivities();
  }

  onClear(): void {
    this.searchForm.reset();
    this.selectedStatus = { name: 'ทั้งหมด', value: '' };
    this.currentPage = 0;
    this.hasSearched = false;
    this.activities = [];
  }

  onPageSizeChange(): void {
    this.currentPage = 0;
    this.loadActivities();
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadActivities();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5;
    let start = Math.max(0, this.currentPage - 2);
    let end = Math.min(this.totalPages, start + maxPages);
    
    if (end - start < maxPages) {
      start = Math.max(0, end - maxPages);
    }
    
    for (let i = start; i < end; i++) {
      pages.push(i);
    }
    return pages;
  }

  get startItemIndex(): number {
    return this.totalElements === 0 ? 0 : (this.currentPage * this.pageSize) + 1;
  }

  get endItemIndex(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
  }

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'SUCCESS': 'active',
      'FAILED': 'inactive',
      'DENIED': 'warning'
    };
    return statusMap[status] || 'active';
  }

  getStatusLabel(status: string): string {
    const labelMap: Record<string, string> = {
      'SUCCESS': 'สำเร็จ',
      'FAILED': 'ล้มเหลว',
      'DENIED': 'ถูกปฏิเสธ'
    };
    return labelMap[status] || 'สำเร็จ';
  }

  getActionLabel(action: string): string {
    const labelMap: Record<string, string> = {
      'CREATE': 'สร้าง',
      'UPDATE': 'แก้ไข',
      'DELETE': 'ลบ',
      'CANCEL': 'ยกเลิก',
      'DOWNLOAD': 'ดาวน์โหลด',
      'VIEW': 'ดู',
      'LOGIN': 'เข้าสู่ระบบ',
      'LOGOUT': 'ออกจากระบบ'
    };
    return labelMap[action] || action;
  }

  viewDetail(activity: ActivityDisplay): void {
    const dialogData: ActivityDetailData = {
      activity: activity,
      viewerRole: this.userRole
    };

    this.dialog.open(ActivityDetailDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: dialogData,
      panelClass: 'activity-detail-dialog'
    });
  }

  private dtoToActivityDisplay(dto: any): ActivityDisplay {
    // Determine category from entityType
    let category = dto.activityCategory || 'Document';
    const entityType = (dto.entityType || '').toLowerCase();
    if (entityType === 'products' || entityType === 'product' || 
        entityType === 'buyers' || entityType === 'customer' ||
        entityType === 'branch' || entityType === 'seller' || entityType === 'user') {
      category = 'Data';
    } else if (entityType === 'document') {
      category = 'Document';
    }

    return {
      id: dto.id,
      action: dto.action,
      entityType: dto.entityType,
      entityId: dto.entityId,
      entityName: dto.entityName,
      userId: dto.userId,
      userName: dto.userName,
      status: dto.status || 'SUCCESS',
      activityCategory: category,
      createdAt: this.parseCreatedAt(dto.createdAt),
      // Audit trail fields
      userRole: dto.userRole,
      sellerName: dto.sellerName,
      branchName: dto.branchName,
      ipAddress: dto.ipAddress,
      device: dto.device,
      userAgent: dto.userAgent,
      httpStatus: dto.httpStatus,
      errorCode: dto.errorCode,
      errorMessage: dto.errorMessage
    };
  }

  private parseCreatedAt(createdAt: any): Date {
    if (!createdAt) {
      return new Date();
    }
    
    if (typeof createdAt === 'string') {
      return new Date(createdAt);
    }
    
    if (Array.isArray(createdAt)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = createdAt;
      return new Date(year, month - 1, day, hour, minute, second);
    }
    
    if (typeof createdAt === 'object') {
      return new Date(
        createdAt.year || 0,
        (createdAt.monthValue || createdAt.month || 1) - 1,
        createdAt.dayOfMonth || createdAt.day || 1,
        createdAt.hour || 0,
        createdAt.minute || 0,
        createdAt.second || 0
      );
    }
    
    return new Date();
  }
}
