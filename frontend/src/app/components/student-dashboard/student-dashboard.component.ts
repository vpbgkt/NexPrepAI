import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router'; // Added Router
import { TestService } from '../../services/test.service';
import { AuthService } from '../../services/auth.service'; // Import AuthService
import { Observable, of } from 'rxjs'; // Import Observable and of
import { map, catchError } from 'rxjs/operators'; // Import map and catchError

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.scss']
})
export class StudentDashboardComponent implements OnInit {
  attempts: any[] = [];
  loading = true; // This will now primarily indicate loading of attempts
  error = '';
  isAccountExpired: boolean = false;
  isLoadingAccountStatus: boolean = true; // For account status check

  constructor(private testSvc: TestService, public authService: AuthService, private router: Router) {} // Inject AuthService and Router, make authService public

  ngOnInit() {
    this.isLoadingAccountStatus = true;
    this.checkAccountStatus().subscribe(() => {
      this.isLoadingAccountStatus = false;
      // Proceed to load attempts after account status is known
      this.loadAttempts();
    });
  }

  checkAccountStatus(): Observable<void> {
    if (this.authService.getRole() === 'student') {
      const accountExpiresAt = this.authService.getAccountExpiresAt();
      if (accountExpiresAt) {
        this.isAccountExpired = new Date(accountExpiresAt) < new Date();
        return of(undefined);
      } else {
        return this.authService.refreshUserProfile().pipe(
          map(user => {
            if (user.accountExpiresAt) {
              this.isAccountExpired = new Date(user.accountExpiresAt) < new Date();
            }
          }),
          catchError(err => {
            console.error('Failed to refresh user profile for account status in dashboard', err);
            this.isAccountExpired = false; // Default to not expired on error
            return of(undefined);
          })
        );
      }
    } else {
      this.isAccountExpired = false;
      return of(undefined);
    }
  }

  loadAttempts() {
    this.loading = true; // For attempts loading
    this.testSvc.getMyAttempts().subscribe({
      next: data => {
        // Filter out null/undefined items or items without required properties
        this.attempts = (data || []).filter(item => item && item.series);
        this.loading = false;
        console.log('Loaded attempts:', this.attempts);
      },
      error: err => {
        this.error = err.message || 'An error occurred while loading your test attempts.';
        console.error('Error loading attempts:', err);
        this.loading = false;
      }
    });
  }
}
