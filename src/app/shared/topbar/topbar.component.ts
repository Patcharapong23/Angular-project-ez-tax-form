import { Component, ElementRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../../shared/auth.service';
import { SidebarService } from '../services/sidebar.service';

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
    private router: Router,
    private sidebarService: SidebarService
  ) {
    this.auth.user$.subscribe((u) => (this.user = u));
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
    // 1. Prioritize Standardized Role Level (Type)
    const level = this.user?.roleLevel || '';
    if (level) {
       switch (level) {
        case 'HQ_ADMIN': return 'ผู้ดูแลสาขาสำนักงานใหญ่';
        case 'BRANCH_ADMIN': return 'ผู้ดูแลสาขาย่อย';
        case 'SYSTEM_ADMIN': return 'ผู้ดูแลระบบ';
        case 'STAFF': return 'พนักงาน';
       }
    }

    // 2. Fallback to Thai Name from Backend (if roleLevel not matched/standard)
    if (this.user?.roleName) {
      return this.user.roleName;
    }

    // 3. Fallback: Parse from roles array (Legacy logic)
    const primaryRole = this.user?.roles?.[0] || '';
    const r = primaryRole
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
        // Attempt to show the code itself if nothing else matches, or 'สมาชิก' as last resort
        return r || 'สมาชิก';
    }
  }

  toggleMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  toggleMobileMenu(): void {
    this.sidebarService.toggleMobileMenu();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.el.nativeElement.contains(e.target)) {
      this.isProfileMenuOpen = false;
    }
  }
}
