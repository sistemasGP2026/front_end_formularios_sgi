import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AuthStatus } from '../interfaces/auth-status.enum';
import { filter, map, take } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

export const isAuthenticatedGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);
  
  if (authService.authStatus() === AuthStatus.authenticated)    return true;
  if (authService.authStatus() === AuthStatus.notAuthenticated) {
    router.navigateByUrl('/auth/sign-in');
    return false;
  }

  return toObservable(authService.authStatus).pipe(
    filter((status) => status !== AuthStatus.checking),
    take(1),
    map((status) => {
      if (status === AuthStatus.authenticated) return true;
      router.navigateByUrl('/inicio');
      return false;
    }),
  );
};