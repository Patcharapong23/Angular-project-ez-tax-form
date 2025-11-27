import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/auth.service'; // ปรับ path ให้ตรงโปรเจคคุณ

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  @Input() isMobileView = false; // <1024px ? (drawer mode)
  @Input() mobileSidebarOpen = false; // drawer มือถือเปิดอยู่ไหม

  @Output() onToggle = new EventEmitter<boolean>(); // layout ใช้เพื่อเซ็ต margin-left

  // ----- สถานะการแสดงผล sidebar -----
  isCollapsed = true; // true = โหมดแคบ 80px
  hoverExpand = false; // true = กำลังขยายเพราะ hover
  isLocked = false; // true = ปักหมุด sidebar ให้กว้างตลอด

  // เมนูย่อยที่กำลังถูกกาง (เช่น 'dataManagement' | 'documentManagement')
  openSubMenu: string | null = null;

  // [UPDATED] เมนูหลักที่ "ถือว่าเป็นหน้าปัจจุบันจริง ๆ"
  // ใช้ตัวเดียวนี้เป็น source of truth สำหรับการไฮไลต์ (สีเหลือง)
  currentMain: string | null = 'dashboard';

  constructor(private auth: AuthService, private router: Router) {}

  // ปุ่มวงกลม pin/unpin ที่มุมขวาบนของ header sidebar
  toggleLock(): void {
    if (this.isMobileView) return; // มือถือไม่ใช้ pin

    this.isLocked = !this.isLocked;

    // ถ้าล็อก -> sidebar ต้องกว้าง
    // ถ้าไม่ล็อก -> sidebar ยุบกลับแคบ
    this.isCollapsed = !this.isLocked;
    this.emitCollapsed();

    // ถ้าเพิ่งปลดล็อก (isLocked = false) => กลับเป็น rail แคบ
    if (!this.isLocked) {
      this.hoverExpand = false;

      // [UPDATED] ปิด submenu ทั้งหมดเพื่อกันสีซ้อน
      this.openSubMenu = null;

      // [UPDATED] ไม่แตะ currentMain เลย
      // เพราะ currentMain คืออันที่เราอยู่จริง → ต้องคงสีเหลืองไว้กับอันเดียวเท่านั้น
    }
  }

  // hover เข้า: ขยาย sidebar ชั่วคราว (desktop เท่านั้น)
  onMouseEnter(): void {
    if (this.isMobileView) return;
    if (!this.isLocked) {
      this.hoverExpand = true;
      this.isCollapsed = false;
      this.emitCollapsed();
      // ไม่แตะ currentMain / openSubMenu
    }
  }

  // hover ออก: ยุบ sidebar กลับเป็น rail (desktop เท่านั้น)
  onMouseLeave(): void {
    if (this.isMobileView) return;
    if (!this.isLocked) {
      this.hoverExpand = false;
      this.isCollapsed = true;
      this.emitCollapsed();

      // [UPDATED] ปิดเมนูย่อยทั้งหมดเพื่อไม่ให้เทา/เหลืองซ้อน
      this.openSubMenu = null;

      // [UPDATED] currentMain ไม่ถูกยุ่งกับ
      // => ตัวที่เป็นหน้าปัจจุบันจะยังคงเหลืองแค่ตัวเดียว
    }
  }

  private emitCollapsed(): void {
    // บอก layout เพื่อปรับ margin-left ของ content (80px vs 260px)
    this.onToggle.emit(this.isCollapsed);
  }

  // ==========================
  // คลิกเมนูหลัก "ไม่มี" submenu
  // เช่น:
  // - dashboard
  // - users
  // - history
  // - api
  // ==========================
  setActive(mainKey: string): void {
    // [UPDATED] จุดนี้คือการบอกว่า "ตอนนี้ฉันอยู่หน้านี้"
    this.currentMain = mainKey;

    // ปิด submenu ทั้งหมดเพราะเราออกจาก group เดิม
    this.openSubMenu = null;
  }

  // ==========================
  // คลิกเมนูหลักที่ "มี" submenu (dataManagement / documentManagement)
  // แค่เปิด/ปิด dropdown เท่านั้น
  // ==========================
  toggleSubMenu(section: string): void {
    // ถ้า sidebar ยังแคบ (rail) บน desktop ให้หยุด
    if (this.isCollapsed && !this.isMobileView) {
      return;
    }

    // toggle เปิด/ปิด dropdown
    this.openSubMenu = this.openSubMenu === section ? null : section;

    // [UPDATED] สำคัญ: "แค่กดเปิด dropdown" ยังไม่ถือว่าเลือกหมวดนั้นจริง
    // เพราะยังไม่ได้เลือกเมนูย่อย
    // ดังนั้นเรา *ไม่* แตะ currentMain ตรงนี้
  }

  // ==========================
  // คลิกเมนูย่อยภายใน dropdown
  // เช่น "นำเข้าข้อมูล", "รายการเอกสารทั้งหมด", ...
  // parentKey = 'dataManagement' | 'documentManagement'
  // subKey    = 'import' | 'documentsall' | ...
  // ==========================
  selectSub(parentKey: string, subKey: string): void {
    // [UPDATED] เมื่อเลือกเมนูย่อยจริงๆ:
    // parentKey กลายเป็น "หมวดปัจจุบัน"
    this.currentMain = parentKey;

    // เราไม่ปิด openSubMenu ตรงนี้ทันที
    // ให้เมนูย่อยยังโชว์อยู่ถ้า sidebar กำลังเปิดกว้าง
    // ถ้า sidebar ยุบเองตอน mouseleave มันจะปิด openSubMenu ให้อยู่แล้ว
  }

  logout(): void {
    if ((this.auth as any).logout) {
      (this.auth as any).logout();
    }
    this.router.navigate(['/login']);
  }
}
