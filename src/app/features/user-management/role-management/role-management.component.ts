import { Component, EventEmitter, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { RoleService, RoleListDto, RoleListResponse } from '../../../shared/services/role.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-role-management',
  templateUrl: './role-management.component.html',
  styleUrls: ['./role-management.component.css']
})
export class RoleManagementComponent implements OnInit {

  roles: RoleListDto[] = [];
  loading = false;
  
  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  
  // Search
  searchTerm = '';
  searchSubject = new Subject<string>();

  // Events to parent component
  @Output() viewRole = new EventEmitter<string>();
  @Output() editRole = new EventEmitter<string>();
  @Output() deleteRole = new EventEmitter<RoleListDto>();

  constructor(
    private roleService: RoleService,
    private cdr: ChangeDetectorRef
  ) { 
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe((term: string) => {
      this.searchTerm = term;
      this.currentPage = 0;
      this.loadRoles();
    });
  }

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles() {
    this.loading = true;
    this.roleService.getRoles(this.searchTerm, this.currentPage, this.pageSize)
      .subscribe({
        next: (resp: RoleListResponse) => {
          this.roles = resp.content;
          this.totalElements = resp.totalElements;
          this.totalPages = resp.totalPages;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Failed to load roles', err);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  onSearch(event: any) {
    this.searchSubject.next(event.target.value);
  }

  onPageChange(page: number) {
    if (page < 0 || page >= this.totalPages) return;
    this.currentPage = page;
    this.loadRoles();
  }

  onPageSizeChange() {
    this.currentPage = 0;
    this.loadRoles();
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

  // Action handlers
  onView(role: RoleListDto): void {
    this.viewRole.emit(role.roleId);
  }

  onEdit(role: RoleListDto): void {
    this.editRole.emit(role.roleId);
  }

  onDelete(role: RoleListDto): void {
    console.log('--- DELETE CLICKED ---', role);
    
    Swal.fire({
      title: 'ยืนยันการลบ',
      text: `ต้องการลบบทบาท "${role.roleName}" ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
      customClass: {
        confirmButton: 'swal2-confirm-red'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.roleService.deleteRole(role.roleId).subscribe({
          next: () => {
            console.log('Delete success');
            Swal.fire('สำเร็จ!', 'ลบบทบาทเรียบร้อย', 'success');
            this.loadRoles();
          },
          error: (err) => {
            console.error('Failed to delete role', err);
            // Extract error message from backend response
            let errorMessage = 'ไม่สามารถลบบทบาทได้';
            if (err?.error?.message) {
              errorMessage = err.error.message;
            } else if (err?.error?.detail) {
              errorMessage = err.error.detail;
            } else if (typeof err?.error === 'string') {
              errorMessage = err.error;
            }
            Swal.fire('ไม่สามารถลบได้', errorMessage, 'error');
          }
        });
      }
    });
  }

  // Check if role is a system role (cannot edit/delete)
  isSystemRole(role: RoleListDto): boolean {
    const systemRoles = ['SYSTEM_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN', 'STAFF'];
    return systemRoles.includes(role.roleCode);
  }
}
