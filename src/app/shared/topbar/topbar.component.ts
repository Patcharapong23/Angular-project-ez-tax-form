// topbar.component.ts
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../auth.service';

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

  /** แก้ตัวอักษร UTF-8 ที่ถูกตีความเป็น Latin-1 (à¸… ฯลฯ) ให้กลับเป็นไทย */
  private fixMojibake(input: string | undefined | null): string {
    if (!input) return '';
    // ถ้าไม่เจอลักษณะ mojibake ก็ส่งกลับเลย
    if (!/à|â|Ã|Å|Æ/.test(input)) return input;

    try {
      // วิธีที่แม่นกว่า: treat ตัวหนังสือเดิมเป็น byte Latin-1 แล้ว decode เป็น UTF-8
      const bytes = new Uint8Array(
        [...input].map((c) => c.charCodeAt(0) & 0xff)
      );
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(bytes);
    } catch {
      // fallback legacy (กรณี browser เก่ามาก)
      try {
        return decodeURIComponent(escape(input));
      } catch {
        return input;
      }
    }
  }

  /** ชื่อที่ใช้แสดง (มี fallback และแก้ mojibake) */
  displayName(): string {
    const raw = (
      this.user?.fullName ||
      this.user?.username ||
      this.user?.email ||
      'User'
    ).trim();
    return this.fixMojibake(raw);
  }

  /** URL รูป avatar (เข้ารหัสชื่อกันเพี้ยน) */
  getAvatarUrl(): string {
    const name = encodeURIComponent(this.displayName() || 'User');
    return `https://ui-avatars.com/api/?name=${name}&background=ffd54f&color=2b2f33&format=svg`;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
