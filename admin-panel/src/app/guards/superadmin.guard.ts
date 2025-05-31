import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service'; // Adjust path as necessary

export const superadminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const userRole = authService.getUserRole();

  if (authService.isLoggedIn() && userRole === 'superadmin') {
    return true;
  } else {
    // Redirect to login or an unauthorized page
    router.navigate(['/auth/login']); // Or a more appropriate route
    return false;
  }
};
