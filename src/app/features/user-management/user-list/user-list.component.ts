import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { UserDialogComponent, UserDialogData } from '../dialogs/user-dialog/user-dialog.component';
import { SwalService } from '../../../shared/services/swal.service';

export interface UserListDto {
  userId: string;
  username: string;
  fullName: string;
  email: string;
  enableFlag: string;
  lockFlag: string;
  createDate: any; // Can be string or array
  updateDate: any;
  createBy?: string;
  roles: string[];
}

export interface UserListResponse {
  content: UserListDto[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  users: UserListDto[] = [];
  loading = true;
  
  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  
  // Search
  searchTerm = '';
  searchSubject = new Subject<string>();

  private apiBase = environment.apiBase;

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private swalService: SwalService,
    private cdr: ChangeDetectorRef
  ) { 
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe((term: string) => {
      this.searchTerm = term;
      this.currentPage = 0;
      this.loadUsers();
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    
    const params: any = {
      page: this.currentPage,
      size: this.pageSize
    };
    
    if (this.searchTerm) {
      params.search = this.searchTerm;
    }

    this.http.get<UserListResponse>(`${this.apiBase}/users`, { params })
      .subscribe({
        next: (resp) => {
          this.users = (resp.content || []).map(u => ({
            ...u,
            createDate: this.convertDateArray(u.createDate),
            updateDate: this.convertDateArray(u.updateDate)
          }));
          this.totalElements = resp.totalElements || 0;
          this.totalPages = resp.totalPages || 0;
          this.loading = false;
          this.cdr.detectChanges(); // Force update view
        },
        error: (err) => {
          console.error('Failed to load users', err);
          this.loading = false;
          this.users = [];
          this.cdr.detectChanges(); // Force update view
        }
      });
  }

  private convertDateArray(dateArr: any): string | null {
    if (!dateArr) return null;
    if (Array.isArray(dateArr) && dateArr.length >= 3) {
      const d = new Date(
        dateArr[0],
        dateArr[1] - 1,
        dateArr[2],
        dateArr[3] || 0,
        dateArr[4] || 0,
        dateArr[5] || 0
      );
      return d.toISOString();
    }
    return dateArr;
  }

  onSearch(event: any): void {
    this.searchSubject.next(event.target.value);
  }

  onPageChange(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.currentPage = page;
    this.loadUsers();
  }

  onPageSizeChange(): void {
    this.currentPage = 0;
    this.loadUsers();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(0, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible);
    
    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }
    
    for (let i = start; i < end; i++) {
      pages.push(i);
    }
    return pages;
  }

  getStatusClass(user: UserListDto): string {
    if (user.lockFlag === 'Y') return 'locked';
    if (user.enableFlag === 'N' || user.enableFlag === 'Cancelled') return 'cancelled';
    return 'active';
  }

  getStatusLabel(user: UserListDto): string {
    if (user.lockFlag === 'Y') return 'ล็อคผู้ใช้งาน';
    if (user.enableFlag === 'N' || user.enableFlag === 'Cancelled') return 'ยกเลิกใช้งาน';
    return 'เปิดใช้งาน';
  }

  onView(user: UserListDto): void {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '900px', 
      data: { mode: 'view', userId: user.userId } as UserDialogData
    });
  }

  onEdit(user: UserListDto): void {
    // If Cancelled, treat as View only
    if (user.enableFlag === 'N' || user.enableFlag === 'Cancelled') {
      const dialogRef = this.dialog.open(UserDialogComponent, {
        width: '900px', // Reverted to 900px
        data: { mode: 'view', userId: user.userId } as UserDialogData
      });
      return;
    }

    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '900px',
      data: { mode: 'edit', userId: user.userId } as UserDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadUsers();
      }
    });
  }

  onDelete(user: UserListDto): void {
    if (user.enableFlag === 'N' || user.enableFlag === 'Cancelled') {
      return;
    }
    this.swalService.confirmDelete(
      `ต้องการลบผู้ใช้ "${user.fullName}" ใช่หรือไม่?`,
      'เมื่อลบแล้ว สถานะจะเปลี่ยนเป็น "ยกเลิกใช้งาน"'
    ).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${this.apiBase}/users/${user.userId}`).subscribe({
          next: () => {
            this.swalService.success('ยกเลิกผู้ใช้สำเร็จ');
            this.loadUsers();
          },
          error: (err) => {
            console.error('Error deleting user:', err);
            this.swalService.error('เกิดข้อผิดพลาด', 'ไม่สามารถลบผู้ใช้ได้');
          }
        });
      }
    });
  }

  onUnlock(user: UserListDto): void {
    this.swalService.confirm(
      'ยืนยันการปลดล็อค',
      `ต้องการปลดล็อคผู้ใช้ "${user.fullName}" ใช่หรือไม่?`
    ).then((result) => {
      if (result.isConfirmed) {
        this.http.patch(`${this.apiBase}/users/${user.userId}/unlock`, {}).subscribe({
          next: () => {
            this.swalService.success('ปลดล็อคผู้ใช้สำเร็จ');
            this.loadUsers();
          },
          error: (err) => {
            console.error('Error unlocking user:', err);
            this.swalService.error('เกิดข้อผิดพลาด', 'ไม่สามารถปลดล็อคผู้ใช้ได้');
          }
        });
      }
    });
  }
}

