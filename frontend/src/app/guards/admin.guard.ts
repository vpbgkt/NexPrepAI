import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isLoggedIn = authService.isLoggedIn();
  const role = authService.getRole();

  // Log current state for debugging
  console.log(
    `AdminGuard: Checking access for URL: ${state.url}\n` +
    `  isLoggedIn (app token): ${isLoggedIn}\n` +
    `  role (from app token): ${role}`
  );

  if (isLoggedIn && (role === 'admin' || role === 'superadmin')) {
    console.log('AdminGuard: Access GRANTED.');
    return true;
  } else {
    console.log('AdminGuard: Access DENIED. Redirecting to /login.');
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
};
