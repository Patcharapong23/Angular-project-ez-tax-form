import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthService } from './shared/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    if (this.auth.isLoggedIn()) return true;

    // เก็บ returnUrl แล้วพาไป login พร้อม query param
    const target = state.url || '/dashboard';
    this.auth.setReturnUrl(target);
    return this.router.createUrlTree(['/login'], {
      queryParams: { returnUrl: target },
    });
  }
}
