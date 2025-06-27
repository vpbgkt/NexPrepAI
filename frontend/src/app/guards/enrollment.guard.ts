import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { EnrollmentService } from '../services/enrollment.service';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class EnrollmentGuard implements CanActivate {
  constructor(
    private enrollmentService: EnrollmentService,
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    // Check if user is authenticated first
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return of(false);
    }

    // Check if user is admin - admins don't need enrollments
    const userRole = this.authService.getRole();
    if (userRole === 'admin' || userRole === 'superadmin') {
      return of(true);
    }

    // For students, check if they have any active enrollments
    return this.enrollmentService.getMyEnrollments().pipe(
      map(response => {
        if (response.success && response.data && response.data.length > 0) {
          // User has enrollments, allow access
          return true;
        } else {
          // User has no enrollments, redirect to profile with message
          this.router.navigate(['/profile'], {
            queryParams: { 
              message: 'Please enroll in at least one exam category to access this content.',
              action: 'enroll'
            }
          });
          return false;
        }
      }),
      catchError(error => {
        console.error('Error checking enrollments:', error);
        // On error, redirect to profile to be safe
        this.router.navigate(['/profile'], {
          queryParams: { 
            message: 'Please check your enrollment status.',
            action: 'enroll'
          }
        });
        return of(false);
      })
    );
  }
}
