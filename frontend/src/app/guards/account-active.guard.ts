import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, of } from 'rxjs';

export const accountActiveGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getRole() !== 'student') {
    return true; // Guard only applies to students
  }

  // Ensure profile is loaded, especially accountExpiresAt
  // This might involve an async call if data isn't readily available
  // For simplicity, assuming AuthService has a synchronous way or has pre-loaded data
  
  // First, try to get data from localStorage
  const accountExpiresAt = authService.getAccountExpiresAt();

  if (accountExpiresAt) {
    const expiryDate = new Date(accountExpiresAt);
    if (expiryDate < new Date()) {
      console.log('AccountActiveGuard: Account expired. Redirecting to profile.');
      router.navigate(['/profile'], { queryParams: { accountExpired: 'true' } });
      return false;
    }
    return true; // Account is active
  } else {
    // If expiry date is not in local storage, try to fetch it.
    // This makes the guard asynchronous.
    return authService.refreshUserProfile().pipe(
      map(user => {
        if (user.accountExpiresAt) {
          const expiryDate = new Date(user.accountExpiresAt);
          if (expiryDate < new Date()) {
            console.log('AccountActiveGuard: Account expired after profile refresh. Redirecting to profile.');
            router.navigate(['/profile'], { queryParams: { accountExpired: 'true' } });
            return false;
          }
          return true; // Account is active
        }
        // If still no expiry date after refresh (e.g., new user, data issue), allow access.
        // Or, you might decide to block access if an expiry date is strictly required.
        console.log('AccountActiveGuard: No expiry date found even after refresh. Allowing access by default.');
        return true; 
      })
    );
  }
};
