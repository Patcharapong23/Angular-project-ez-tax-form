import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../../shared/auth.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
})
export class TopbarComponent implements OnInit {
  user?: {
    companyName?: string;
    firstName?: string;
    userName?: string;
    email?: string;
  };
  isProfileMenuOpen = false;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.user = this.buildTopbarUser(
      this.auth.getUser(),
      this.auth.decodeToken()
    );
  }

  displayName(): string {
    const n = (this.user?.firstName || '').trim();
    if (n) return n;
    return (this.user?.userName || '').trim();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private buildTopbarUser(u: AuthUser | null, jwt: any) {
    if (u) {
      const companyName =
        u.tenantNameTh || u.companyName || u.tenantNameEn || '';
      const firstName = u.firstName || u.fullName || '';
      const userName =
        u.userName || u.username || (u.email ? u.email.split('@')[0] : '');
      return { companyName, firstName, userName, email: u.email };
    }
    // fallback จาก JWT
    const userName = jwt?.userName || jwt?.username || jwt?.sub || '';
    return { companyName: '', firstName: '', userName, email: '' };
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent) {
    const target = ev.target as HTMLElement;
    if (
      !target.closest('.user-profile') &&
      !target.closest('.profile-dropdown')
    ) {
      this.isProfileMenuOpen = false;
    }
  }
}
