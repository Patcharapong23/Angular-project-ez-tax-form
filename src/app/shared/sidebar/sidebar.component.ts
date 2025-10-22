import { Component, EventEmitter, Output } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  isCollapsed = true;
  isLocked = false;
  hoverExpand = false;

  openSubMenu: string | null = null;
  activeMain: 'dataManagement' | 'documentManagement' | null = null;

  @Output() onToggle = new EventEmitter<boolean>();

  constructor(private auth: AuthService, private router: Router) {
    // อัปเดต state เมื่อเปลี่ยนหน้า
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.updateActiveFromUrl(this.router.url));

    // เรียกครั้งแรกตอนโหลด
    this.updateActiveFromUrl(this.router.url);
  }

  private updateActiveFromUrl(url: string): void {
    // จับกลุ่มตาม prefix เส้นทาง (แก้ให้ตรงกับ route ของคุณ)
    if (url.startsWith('/documents')) {
      this.activeMain = 'documentManagement';
      this.openSubMenu = 'documentManagement';
    } else if (
      url.startsWith('/company') ||
      url.startsWith('/branches') ||
      url.startsWith('/general') ||
      url.startsWith('/customers') ||
      url.startsWith('/products')
    ) {
      this.activeMain = 'dataManagement';
      this.openSubMenu = 'dataManagement';
    } else {
      this.activeMain = null;
      // ไม่บังคับปิดเมนูที่ผู้ใช้เปิดเอง
    }
  }

  onMouseEnter(): void {
    if (!this.isLocked) {
      this.hoverExpand = true;
      this.isCollapsed = false;
    }
  }

  onMouseLeave(): void {
    if (!this.isLocked) {
      this.hoverExpand = false;
      this.isCollapsed = true;
      this.openSubMenu = null;
      this.onToggle.emit(this.isCollapsed);
    }
  }

  toggleLock(): void {
    if (!this.isLocked) {
      this.isLocked = true;
      this.hoverExpand = false;
      this.isCollapsed = false;
    } else {
      this.isLocked = false;
      this.isCollapsed = true;
      this.hoverExpand = false;
      this.openSubMenu = null;
    }
    this.onToggle.emit(this.isCollapsed);
  }

  toggleSubMenu(menuName: string): void {
    if (this.isCollapsed) return;
    this.openSubMenu = this.openSubMenu === menuName ? null : menuName;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
