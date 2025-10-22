import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {
  const r = inject(Router);
  const token = localStorage.getItem('ez_auth_token');
  if (!token) {
    r.navigateByUrl('/login');
    return false;
  }
  return true;
};
