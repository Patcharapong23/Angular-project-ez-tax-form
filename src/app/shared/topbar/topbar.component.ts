import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../../shared/auth.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css'],
})
export class TopbarComponent implements OnInit {
  user: AuthUser | null = null;
  isProfileMenuOpen = false;

  @Output() toggleSidebar = new EventEmitter<void>();

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.user = this.auth.getUser();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  // --- (*** เพิ่มฟังก์ชันนี้เข้ามา ***) ---
  getAvatarUrl(): string {
    const name = this.user?.fullName || 'U';
    // (1) ใช้ encodeURIComponent เพื่อแปลงชื่อภาษาไทย
    const encodedName = encodeURIComponent(name);
    // (2) ส่งชื่อที่แปลงแล้วไปให้ API
    return `https://ui-avatars.com/api/?name=${encodedName}&background=ffd54f&color=2b2f33`;
  }
}
