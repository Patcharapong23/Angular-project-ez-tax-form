import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SystemAdminApiService, Tenant, TenantPage } from '../services/system-admin-api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tenant-management',
  templateUrl: './tenant-management.component.html',
  styleUrls: ['./tenant-management.component.css']
})
export class TenantManagementComponent implements OnInit {
  tenants: Tenant[] = [];
  loading = true;
  searchTerm = '';
  totalElements = 0;
  currentPage = 0;
  pageSize = 20;

  constructor(
    private systemAdminApi: SystemAdminApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTenants();
  }

  loadTenants(): void {
    this.loading = true;
    this.systemAdminApi.getTenants({
      query: this.searchTerm || undefined,
      page: this.currentPage,
      size: this.pageSize
    }).subscribe({
      next: (data: TenantPage) => {
        this.tenants = data.content;
        this.totalElements = data.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load tenants:', err);
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.loadTenants();
  }

  getStatusClass(status: string): string {
    return status === 'ACTIVE' ? 'status-active' : 'status-suspended';
  }

  viewDashboard(tenant: Tenant): void {
    // Navigate to system dashboard with tenant selected
    this.router.navigate(['/system/dashboard'], {
      queryParams: { sellerId: tenant.sellerId }
    });
  }

  async suspendTenant(tenant: Tenant): Promise<void> {
    const result = await Swal.fire({
      title: 'ระงับการใช้งาน?',
      html: `คุณต้องการระงับใช้งานบริษัท <strong>${tenant.companyName}</strong> หรือไม่?`,
      icon: 'warning',
      input: 'textarea',
      inputPlaceholder: 'ระบุเหตุผล (ไม่บังคับ)',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'ระงับใช้งาน',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      this.systemAdminApi.updateTenantStatus(tenant.sellerId, 'SUSPEND', result.value || '').subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'สำเร็จ',
            text: `ระงับใช้งาน ${tenant.companyName} เรียบร้อยแล้ว`,
            timer: 2000,
            showConfirmButton: false
          });
          this.loadTenants();
        },
        error: (err) => {
          console.error('Failed to suspend tenant:', err);
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถระงับใช้งานได้ กรุณาลองใหม่'
          });
        }
      });
    }
  }

  async activateTenant(tenant: Tenant): Promise<void> {
    const result = await Swal.fire({
      title: 'เปิดใช้งาน?',
      html: `คุณต้องการเปิดใช้งานบริษัท <strong>${tenant.companyName}</strong> หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#22c55e',
      confirmButtonText: 'เปิดใช้งาน',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      this.systemAdminApi.updateTenantStatus(tenant.sellerId, 'ACTIVATE', '').subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'สำเร็จ',
            text: `เปิดใช้งาน ${tenant.companyName} เรียบร้อยแล้ว`,
            timer: 2000,
            showConfirmButton: false
          });
          this.loadTenants();
        },
        error: (err) => {
          console.error('Failed to activate tenant:', err);
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถเปิดใช้งานได้ กรุณาลองใหม่'
          });
        }
      });
    }
  }
}

