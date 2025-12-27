import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type ActivityAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'CANCEL' | 'DOWNLOAD' | 'VIEW';
export type ActivityEntity = 'document' | 'products' | 'buyers' | 'branch' | 'seller' | 'user';

export interface Activity {
  id: string;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId: string;
  entityName: string;
  timestamp: Date;
  icon: string;
  iconBg: string;
  userName?: string;
}

export interface ActivityLogDto {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  userId: string;
  userName: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private readonly base = `${environment.apiBase}/activity`;
  private readonly MAX_ACTIVITIES = 5;
  private activitiesSubject = new BehaviorSubject<Activity[]>([]);
  
  /** Observable of recent activities (max 5) */
  activities$: Observable<Activity[]> = this.activitiesSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Load recent activities from backend
   */
  loadRecentActivities(): void {
    this.http.get<{ success: boolean; data: ActivityLogDto[] }>(`${this.base}/recent`)
      .pipe(
        map(response => response.data || []),
        catchError(() => of([]))
      )
      .subscribe(dtos => {
        const activities = dtos.map(dto => this.dtoToActivity(dto));
        this.activitiesSubject.next(activities);
      });
  }

  /**
   * Log a new activity (sends to backend)
   */
  log(action: ActivityAction, entity: ActivityEntity, entityId: string, entityName: string): void {
    const request = {
      action,
      entityType: entity,
      entityId,
      entityName
    };

    // Optimistically add to local state immediately
    const activity: Activity = {
      id: this.generateId(),
      action,
      entity,
      entityId,
      entityName,
      timestamp: new Date(),
      icon: this.getIcon(action, entity),
      iconBg: this.getIconBg(action)
    };

    const currentActivities = this.activitiesSubject.getValue();
    const updatedActivities = [activity, ...currentActivities].slice(0, this.MAX_ACTIVITIES);
    this.activitiesSubject.next(updatedActivities);

    // Send to backend (fire and forget)
    this.http.post<any>(this.base, request)
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  /**
   * Convenience methods for common actions
   */
  logDocumentCreate(docNo: string, docId: string): void {
    this.log('CREATE', 'document', docId, docNo);
  }

  logDocumentUpdate(docNo: string, docId: string): void {
    this.log('UPDATE', 'document', docId, docNo);
  }

  logDocumentCancel(docNo: string, docId: string): void {
    this.log('CANCEL', 'document', docId, docNo);
  }

  logDocumentDownload(docNo: string, docId: string): void {
    this.log('DOWNLOAD', 'document', docId, docNo);
  }

  logProductCreate(productName: string, productId: string): void {
    this.log('CREATE', 'products', productId, productName);
  }

  logProductUpdate(productName: string, productId: string): void {
    this.log('UPDATE', 'products', productId, productName);
  }

  logProductDelete(productName: string, productId: string): void {
    this.log('DELETE', 'products', productId, productName);
  }

  logCustomerCreate(customerName: string, customerId: string): void {
    this.log('CREATE', 'buyers', customerId, customerName);
  }

  logCustomerUpdate(customerName: string, customerId: string): void {
    this.log('UPDATE', 'buyers', customerId, customerName);
  }

  logCustomerDelete(customerName: string, customerId: string): void {
    this.log('DELETE', 'buyers', customerId, customerId);
  }

  /**
   * Clear all activities (e.g., on logout)
   */
  clear(): void {
    this.activitiesSubject.next([]);
  }

  /**
   * Get action label in Thai
   */
  /**
   * Get action label in Thai
   */
  getActionLabel(action: ActivityAction | string, entity: ActivityEntity | string): string {
    // console.log('getActionLabel called with:', action, entity); 

    if (!action) action = '';
    if (!entity) entity = '';

    const actionKey = action.toUpperCase();
    const entityKey = entity.toLowerCase();

    const entityLabels: Record<string, string> = {
      document: 'เอกสาร',
      documents: 'เอกสาร',
      product: 'ข้อมูลสินค้า',
      products: 'ข้อมูลสินค้า',
      customer: 'ข้อมูลลูกค้า',
      customers: 'ข้อมูลลูกค้า',
      buyer: 'ข้อมูลลูกค้า',
      buyers: 'ข้อมูลลูกค้า',
      branch: 'ข้อมูลสาขา',
      seller: 'ข้อมูลบริษัท',
      user: 'ข้อมูลผู้ใช้',
      users: 'ข้อมูลผู้ใช้'
    };

    const actionLabels: Record<string, string> = {
      CREATE: 'สร้าง',
      UPDATE: 'แก้ไข',
      DELETE: 'ลบ',
      CANCEL: 'ยกเลิก',
      DOWNLOAD: 'ดาวน์โหลด',
      VIEW: 'ดู'
    };

    const actLabel = actionLabels[actionKey] || action;
    const entLabel = entityLabels[entityKey] || entity;

    // console.log('Resolved labels:', actLabel, entLabel);

    return `${actLabel}${entLabel}`;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  /**
   * Public method to convert DTOs to Activity objects (used by Dashboard sync)
   */
  convertDtosToActivities(dtos: ActivityLogDto[]): Activity[] {
      return dtos.map(dto => this.dtoToActivity(dto));
  }

  private dtoToActivity(dto: ActivityLogDto): Activity {
    let timestamp: Date;
    
    // Safety check for createdAt
    if (!dto.createdAt) {
       timestamp = new Date();
    } else if (Array.isArray(dto.createdAt)) {
       const d = dto.createdAt as any;
       // Java array: [year, month, day, hour, minute, second]
       // JS Date: new Date(year, monthIndex, day, hours, minutes, seconds)
       timestamp = new Date(d[0], (d[1] || 1) - 1, d[2] || 1, d[3] || 0, d[4] || 0, d[5] || 0);
    } else {
       timestamp = new Date(dto.createdAt);
    }

    if (isNaN(timestamp.getTime())) {
        timestamp = new Date();
    }

    const activity = {
      id: dto.id,
      action: dto.action as ActivityAction,
      entity: (dto.entityType ? dto.entityType.toLowerCase() : 'document') as ActivityEntity,
      entityId: dto.entityId,
      entityName: dto.entityName,
      timestamp: timestamp,
      icon: this.getIcon(dto.action as ActivityAction, dto.entityType as ActivityEntity),
      iconBg: this.getIconBg(dto.action as ActivityAction),
      userName: dto.userName
    };

    return activity;
  }

  private getIcon(action: ActivityAction | string, entity: ActivityEntity | string): string {
    if (!action) action = '';
    if (!entity) entity = 'document'; // Default to document if entity is missing
    
    const entityKey = entity.toLowerCase();

    // Entity-specific icons
    const entityIcons: Record<string, string> = {
      document: 'ti-file-description',
      documents: 'ti-file-description',
      product: 'ti-package',
      products: 'ti-package',
      customer: 'ti-users-group',
      customers: 'ti-users-group',
      buyer: 'ti-users-group',
      buyers: 'ti-users-group',
      branch: 'ti-building-store',
      seller: 'ti-building',
      user: 'ti-user-circle',
      users: 'ti-user-circle'
    };

    const actionUpper = action.toUpperCase();
    if (actionUpper === 'DOWNLOAD') return 'ti-download';
    if (actionUpper === 'CANCEL') return 'ti-file-off';
    if (actionUpper === 'DELETE') return 'ti-trash';

    return entityIcons[entityKey] || 'ti-activity';
  }

  getRelativeTime(date: Date | string | number[]): string {
      // Simple and robust time diff
      let target: Date;
      if (!date) return '-';

      if (Array.isArray(date)) {
          // [y,m,d,h,m,s]
          target = new Date(date[0], (date[1]||1)-1, date[2]||1, date[3]||0, date[4]||0, date[5]||0);
      } else {
          target = new Date(date);
      }

      if (isNaN(target.getTime())) return '-';

      const now = new Date();
      const diff = now.getTime() - target.getTime();
      
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (seconds < 60) return 'เมื่อสักครู่';
      if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
      if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
      return `${days} วันที่แล้ว`;
  }

  private getIconBg(action: ActivityAction | string): string {
    if (!action) return '#6366f1';
    
    const actionKey = action.toUpperCase();
    const colors: Record<string, string> = {
      CREATE: '#3b82f6', // Blue (for Create Doc / New)
      UPDATE: '#f59e0b', // Yellow/Orange (For edits)
      DELETE: '#ef4444', // Red
      CANCEL: '#ef4444', // Red
      DOWNLOAD: '#3b82f6', // Blue
      VIEW: '#6366f1'    // Indigo
    };
    return colors[actionKey] || '#6366f1';
  }
}

