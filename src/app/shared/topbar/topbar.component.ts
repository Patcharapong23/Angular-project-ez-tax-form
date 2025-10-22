import { Component, ElementRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../../shared/auth.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css'],
})
export class TopbarComponent {
  user: AuthUser | null = null;
  isProfileMenuOpen = false;

  constructor(
    private el: ElementRef,
    private auth: AuthService,
    private router: Router
  ) {
    // รับ user ล่าสุดเสมอ
    this.auth.user$.subscribe((u) => (this.user = u ?? this.auth.getUser()));
    // ถ้ายังไม่มี role ใน storage ลอง decode จาก token แล้วอัปเดต
    if (!this.user?.role) {
      const claims = this.auth.decodeToken();
      if (claims?.role) {
        const u = this.auth.getUser();
        if (u) {
          u.role = claims.role;
          // เก็บกลับเข้า storage/stream
          (this as any).auth['setUser']?.(u);
        }
      }
    }
  }

  displayName(): string {
    return (
      this.user?.fullName?.trim() ||
      this.user?.userName?.trim() ||
      (this.user?.email ? this.user.email.split('@')[0] : '')
    );
  }

  initial(): string {
    const name = this.displayName();
    return name ? name.charAt(0).toUpperCase() : 'U';
  }

  roleLabel(): string {
    // แปลงให้เหลือรูปแบบเดียว: เอา ROLE_ ออก, แทน - และช่องว่างเป็น _, ตัวพิมพ์ใหญ่
    const r = (this.user?.role || '')
      .toUpperCase()
      .replace(/^ROLE_/, '')
      .replace(/[-\s]/g, '_');

    switch (r) {
      case 'HQ_ADMIN':
        return 'ผู้ดูแลสาขาสำนักงานใหญ่';
      case 'BRANCH_ADMIN':
        return 'ผู้ดูแลสาขาย่อย';
      case 'SYSTEM_ADMIN':
        return 'ผู้ดูแลระบบ';
      case 'STAFF':
        return 'พนักงาน';
      default:
        return 'สมาชิก';
    }
  }

  toggleMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  // คลิกนอกเมนู เพื่อปิด dropdown
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.el.nativeElement.contains(e.target)) {
      this.isProfileMenuOpen = false;
    }
  }
}
