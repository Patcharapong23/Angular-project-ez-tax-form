import { APP_INITIALIZER } from '@angular/core';
import { AuthService } from './shared/auth.service';
import { firstValueFrom } from 'rxjs';

/**
 * Factory function for APP_INITIALIZER
 * Attempts to restore session on app load using refresh token cookie
 */
export function initializeAuth(authService: AuthService) {
  return async (): Promise<void> => {
    // Check if user data exists in localStorage (means was logged in before)
    const userStr = localStorage.getItem('auth.user');
    if (userStr) {
      try {
        console.log('[AUTH_INIT] User found in storage, attempting rehydration...');
        const success = await firstValueFrom(authService.rehydrate());
        if (success) {
          console.log('[AUTH_INIT] Session restored successfully');
        } else {
          console.log('[AUTH_INIT] Session expired, user needs to login again');
        }
      } catch (err) {
        console.warn('[AUTH_INIT] Rehydration failed:', err);
      }
    } else {
      console.log('[AUTH_INIT] No previous session found');
    }
  };
}

/**
 * Provider for APP_INITIALIZER
 * Add this to providers array in app.module.ts
 */
export const AUTH_INITIALIZER_PROVIDER = {
  provide: APP_INITIALIZER,
  useFactory: initializeAuth,
  deps: [AuthService],
  multi: true
};
