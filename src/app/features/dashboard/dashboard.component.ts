import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../../shared/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent {
  user: AuthUser | null = this.auth.getUser();
  companyName = this.user?.companyName || 'Northbkk';

  constructor(private router: Router, private auth: AuthService) {}

  displayName(): string {
    // ใช้ตัวเดียวกับ topbar ถ้ามี (แปะซ้ำเพื่อความครบ)
    const raw = (
      this.user?.fullName ||
      this.user?.username ||
      this.user?.email ||
      'User'
    ).trim();
    // quick guard: ถ้า mojibake (à…)
    if (/à|â|Ã|Å|Æ/.test(raw)) {
      try {
        const bytes = new Uint8Array(
          [...raw].map((c) => c.charCodeAt(0) & 0xff)
        );
        return new TextDecoder('utf-8').decode(bytes);
      } catch {
        return raw;
      }
    }
    return raw;
  }

  openProfile() {
    /* toggle dropdown หรือไปหน้าโปรไฟล์ */
  }

  goCreate() {
    this.router.navigate(['/forms/create']);
  }
  goList() {
    this.router.navigate(['/forms']);
  }
  goSettings() {
    this.router.navigate(['/settings']);
  }
}
