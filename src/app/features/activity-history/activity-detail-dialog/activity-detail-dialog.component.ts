import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ActivityDetailData {
  activity: {
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
    // Extended fields for advanced view
    errorCode?: string;
    errorMessage?: string;
    httpStatus?: number;
    ipAddress?: string;
    device?: string;
    userAgent?: string;
    sellerId?: string;
    sellerName?: string;
    branchId?: string;
    branchName?: string;
    userRole?: string;
  };
  viewerRole: string; // SYSTEM_ADMIN, HQ_ADMIN, BRANCH_ADMIN, STAFF
}

@Component({
  selector: 'app-activity-detail-dialog',
  templateUrl: './activity-detail-dialog.component.html',
  styleUrls: ['./activity-detail-dialog.component.css']
})
export class ActivityDetailDialogComponent {
  showTechnicalSection = false;
  copySuccess = false;

  constructor(
    public dialogRef: MatDialogRef<ActivityDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ActivityDetailData
  ) {}

  // Check if viewer can see specific fields based on role
  get canSeeTransactionId(): boolean {
    return this.data.viewerRole !== 'STAFF';
  }

  get canSeeCopyButton(): boolean {
    return this.data.viewerRole === 'SYSTEM_ADMIN';
  }

  get canSeeEventType(): boolean {
    return this.data.viewerRole !== 'STAFF';
  }

  get canSeeUserName(): boolean {
    return this.data.viewerRole !== 'STAFF';
  }

  get canSeeRole(): boolean {
    return this.data.viewerRole === 'SYSTEM_ADMIN';
  }

  get canSeeSeller(): boolean {
    return this.data.viewerRole === 'SYSTEM_ADMIN';
  }

  get canSeeBranch(): boolean {
    return ['SYSTEM_ADMIN', 'HQ_ADMIN'].includes(this.data.viewerRole);
  }

  get canSeeTechnicalSection(): boolean {
    return this.data.viewerRole === 'SYSTEM_ADMIN';
  }

  get shortTransactionId(): string {
    if (!this.data.activity.id) return '';
    const id = this.data.activity.id;
    return id.length > 12 ? `...${id.slice(-8)}` : id;
  }

  get dialogTitle(): string {
    if (this.data.viewerRole === 'STAFF') {
      return 'รายละเอียดการใช้งาน';
    }
    return 'รายละเอียดกิจกรรม';
  }

  get staffInfoMessage(): string {
    return 'นี่คือประวัติการใช้งานของคุณ ข้อมูลนี้ใช้เพื่อช่วยตรวจสอบการทำงานย้อนหลังเท่านั้น';
  }

  getStatusLabel(status: string): string {
    const labelMap: Record<string, string> = {
      'SUCCESS': 'สำเร็จ',
      'FAILED': 'ล้มเหลว',
      'DENIED': 'ถูกปฏิเสธ'
    };
    return labelMap[status] || 'สำเร็จ';
  }

  getStatusClass(status: string): string {
    const classMap: Record<string, string> = {
      'SUCCESS': 'status-success',
      'FAILED': 'status-failed',
      'DENIED': 'status-denied'
    };
    return classMap[status] || 'status-success';
  }

  getCategoryLabel(category: string): string {
    const labelMap: Record<string, string> = {
      'Document': 'เอกสาร',
      'Data': 'ข้อมูล',
      'Login': 'เข้าสู่ระบบ',
      'Admin': 'จัดการระบบ',
      'Setting': 'ตั้งค่า',
      'Integration': 'เชื่อมต่อ'
    };
    return labelMap[category] || category;
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

  getEntityTypeLabel(type: string): string {
    if (!type) return '-';
    // Use lower case for matching
    const t = type.toLowerCase();
    
    // User requested to keep 'products' and 'buyers' as is (English)
    if (t === 'products' || t === 'product' || t === 'buyers' || t === 'buyer') {
      return type;
    }

    const labelMap: Record<string, string> = {
      'document': 'เอกสาร',
      // 'products': 'สินค้า', // Removed
      // 'buyers': 'ผู้ซื้อ', // Removed
      'customer': 'ผู้ซื้อ',
      'branch': 'สาขา',
      'seller': 'ผู้ขาย',
      'user': 'ผู้ใช้งาน'
    };
    return labelMap[t] || type;
  }

  formatDate(date: Date): string {
    if (!date) return '-';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hour = d.getHours().toString().padStart(2, '0');
    const minute = d.getMinutes().toString().padStart(2, '0');
    const second = d.getSeconds().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
  }

  toggleTechnicalSection(): void {
    this.showTechnicalSection = !this.showTechnicalSection;
  }

  copyTransactionId(): void {
    if (this.data.activity.id) {
      navigator.clipboard.writeText(this.data.activity.id).then(() => {
        this.copySuccess = true;
        setTimeout(() => this.copySuccess = false, 2000);
      });
    }
  }

  getHttpStatusClass(status: number | undefined): string {
    if (!status) return 'http-ok';
    if (status >= 200 && status < 300) return 'http-ok';
    if (status >= 400 && status < 500) return 'http-warn';
    if (status >= 500) return 'http-error';
    return 'http-ok';
  }

  close(): void {
    this.dialogRef.close();
  }
}
