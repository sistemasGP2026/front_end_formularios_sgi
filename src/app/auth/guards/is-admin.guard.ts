import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AuthStatus } from '../interfaces/auth-status.enum';

export const isAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  const status = authService.authStatus();
  const user   = authService.currentUser();

  if (status === AuthStatus.checking) return false;

  if (status === AuthStatus.notAuthenticated || !user) {
    router.navigateByUrl('/auth');
    return false;
  }

  if (!user.roles?.includes('ADMIN')) {
    router.navigateByUrl('/inicio');
    return false;
  }

  return true;
};