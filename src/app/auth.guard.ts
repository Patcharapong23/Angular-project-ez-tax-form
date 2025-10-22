import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './shared/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  // canActivate(
  //   route: ActivatedRouteSnapshot,
  //   state: RouterStateSnapshot
  // ): boolean | UrlTree {
  //   if (this.auth.isLoggedIn()) {
  //     // ถ้า Login แล้ว, ให้ไปต่อได้
  //     return true;
  //   } else {
  //     // ถ้ายังไม่ได้ Login
  //     // ให้จำ URL ที่ผู้ใช้พยายามจะเข้าไป
  //     const targetUrl = state.url;
  //     // เราสามารถสร้าง Query Parameter เพื่อส่งต่อไปยังหน้า Login ได้
  //     return this.router.createUrlTree(['/login'], {
  //       queryParams: { returnUrl: targetUrl },
  //     });
  //   }
  // }
  canActivate(): boolean | UrlTree {
    return this.auth.isLoggedIn() ? true : this.router.parseUrl('/login');
  }
}
