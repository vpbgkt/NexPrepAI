import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service'; // Assuming AuthService is in the same directory or path is correct

export const authHttpInterceptorInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken(); // Method to get token from AuthService

  let clonedRequest = req;
  if (token) {
    clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Unauthorized: Potentially invalid token or session expired
        // Check if the error is from a specific API that indicates session expiry vs. just needing login
        // For now, we'll assume any 401 means logout and redirect to login
        console.error('Interceptor: Unauthorized error (401)', error);
        authService.logout(); // Clear session
        router.navigate(['/login'], { queryParams: { sessionExpired: 'true' } });
        // Optionally, display a message to the user
      } else if (error.status === 403) {
        // Forbidden: User is authenticated but not authorized for the resource
        // This could be due to role restrictions or an expired account for students
        console.error('Interceptor: Forbidden error (403)', error);
        const currentUserRole = authService.getRole();
        const accountExpiresAt = authService.getAccountExpiresAt();
        
        if (currentUserRole === 'student') {
          let isLikelyExpired = false;
          if (accountExpiresAt) {
            const expiryDate = new Date(accountExpiresAt);
            if (expiryDate < new Date()) {
              isLikelyExpired = true;
            }
          }
          
          // You might also check error.error.message for specific backend messages
          // e.g., if (error.error?.message === 'Account expired')
          if (isLikelyExpired || (error.error?.message && error.error.message.toLowerCase().includes('account has expired'))) {
            // Specific handling for students with expired accounts
            // authService.logout(); // Decide if logout is appropriate or just block access
            router.navigate(['/profile'], { queryParams: { accountExpired: 'true' } });
            // The profile page will show the expiry status.
            // Or redirect to a dedicated 'account-expired' page:
            // router.navigate(['/account-expired']);
          } else {
            // Generic 403 for student - perhaps redirect to a generic access-denied page or home
            // router.navigate(['/access-denied']);
          }
        } else {
          // Handle 403 for other roles (admin, superadmin) if necessary
          // router.navigate(['/access-denied']);
        }
      }
      return throwError(() => error);
    })
  );
};
