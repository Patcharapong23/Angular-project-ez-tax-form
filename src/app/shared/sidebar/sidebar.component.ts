import { Component, EventEmitter, Output } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  [x: string]: any;
  /** เริ่มต้นให้พับ */
  isCollapsed = true;

  /** โหมดล็อกค้างด้วยปุ่ม (มีจุดเมื่อ true) */
  isLocked = false;

  /** เปิดชั่วคราวเมื่อ hover (ทำงานเฉพาะตอน !isLocked) */
  hoverExpand = false;

  openSubMenu: string | null = null;

  @Output() onToggle = new EventEmitter<boolean>();

  constructor(private auth: AuthService, private router: Router) {}

  onMouseEnter(): void {
    if (!this.isLocked) {
      this.hoverExpand = true;
      this.isCollapsed = false; // เปิดชั่วคราว
    }
  }

  onMouseLeave(): void {
    if (!this.isLocked) {
      this.hoverExpand = false;
      this.isCollapsed = true; // กลับมาพับ
      this.openSubMenu = null;
      this.onToggle.emit(this.isCollapsed);
    }
  }

  /** คลิกปุ่มวงกลมเพื่อสลับล็อก/ปลดล็อก
   * - locked=true: เปิดค้าง (มีจุด)
   * - locked=false: กลับสู่โหมด hover (ไม่มีจุดและเริ่มพับ)
   */
  toggleLock(): void {
    if (!this.isLocked) {
      // เข้าสู่โหมดล็อก (เปิดค้าง)
      this.isLocked = true;
      this.hoverExpand = false;
      this.isCollapsed = false;
    } else {
      // ออกจากโหมดล็อก กลับสู่ hover mode
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
