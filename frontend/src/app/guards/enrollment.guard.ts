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
    // First force a refresh to ensure we have the latest data
    return this.enrollmentService.getMyEnrollments().pipe(
      switchMap(() => this.enrollmentService.getMyEnrollments()), // Double-check with fresh data
      map(response => {
        console.log('🔍 EnrollmentGuard: Checking enrollments response:', response);
        
        if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
          // Additional check: ensure at least one enrollment is actually active
          const activeEnrollments = response.data.filter((enrollment: any) => 
            enrollment.status === 'active'
          );
          
          console.log('✅ EnrollmentGuard: Active enrollments found:', activeEnrollments.length);
          
          if (activeEnrollments.length > 0) {
            return true;
          }
        }
        
        console.log('❌ EnrollmentGuard: No active enrollments found. Response:', response);
        // User has no active enrollments, redirect to profile with message
        this.router.navigate(['/profile'], {
          queryParams: { 
            message: 'Please enroll now in at least one exam category to access the NexPrep Platform.',
            action: 'enroll'
          }
        });
        return false;
      }),
      catchError(error => {
        console.error('❌ EnrollmentGuard: Error checking enrollments:', error);
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
