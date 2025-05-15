// frontend/src/app/guards/student.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const studentGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isLoggedIn = authService.isLoggedIn();
  const role = authService.getRole();

  // Log current state for debugging
  console.log(
    `StudentGuard: Checking access for URL: ${state.url}\n` +
    `  isLoggedIn (app token): ${isLoggedIn}\n` +
    `  role (from app token): ${role}`
  );

  if (isLoggedIn && (role === 'student' || role === 'admin')) { // Admin can also access student routes
    console.log('StudentGuard: Access GRANTED.');
    return true;
  } else {
    console.log('StudentGuard: Access DENIED. Redirecting to /login.');
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
};
