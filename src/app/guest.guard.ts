import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from './shared/auth.service';

@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (this.auth.isLoggedIn()) {
      // ถ้าล็อกอินแล้ว ไม่ให้เข้า /login /register → ส่งไป dashboard
      return this.router.createUrlTree(['/dashboard']);
    }

    // ถ้ายังไม่ได้ล็อกอิน แต่มี token เก่า/หมดอายุค้างอยู่ ให้ลบทิ้ง
    // โดยไม่ต้อง navigate เพราะเรากำลังจะไปหน้า guest อยู่แล้ว
    if (this.auth.token) {
      this.auth.logout(false, false);
    }

    return true;
  }
}
