// src/app/shared/guards/permission.guard.ts
import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root',
})
export class PermissionGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    // Get required permission from route data
    const requiredPermission = route.data['requiredPermission'] as string | undefined;
    const requiredPermissions = route.data['requiredPermissions'] as string[] | undefined;
    const requireAll = route.data['requireAllPermissions'] as boolean | undefined;

    // If no permission required, allow access
    if (!requiredPermission && (!requiredPermissions || requiredPermissions.length === 0)) {
      return true;
    }

    // Check if user is logged in first
    if (!this.authService.currentUser) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    // Load permissions if not already loaded
    return this.authService.permissions$.pipe(
      take(1),
      switchMap((permissions) => {
        if (permissions.length === 0) {
          // Load permissions from backend
          return this.authService.loadPermissions();
        }
        return of(permissions);
      }),
      map((permissions) => {
        let hasAccess = false;

        if (requiredPermission) {
          // Single permission check
          hasAccess = permissions.includes(requiredPermission);
        } else if (requiredPermissions && requiredPermissions.length > 0) {
          // Multiple permissions check
          if (requireAll) {
            hasAccess = requiredPermissions.every((p) => permissions.includes(p));
          } else {
            hasAccess = requiredPermissions.some((p) => permissions.includes(p));
          }
        }

        if (!hasAccess) {
          console.warn('PermissionGuard: Access denied. Required:', requiredPermission || requiredPermissions);
          this.router.navigate(['/403']); // Forbidden page
          return false;
        }

        return true;
      })
    );
  }
}
