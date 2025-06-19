import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TestService, TestSeries } from '../../services/test.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service'; // Import NotificationService
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BackendUser } from '../../models/user.model'; // Import BackendUser

interface GroupedTests {
  familyId: string;
  familyName: string;
  familyCode: string;
  tests: TestSeries[];
}

@Component({
    selector: 'app-test-list',
    templateUrl: './test-list.component.html',
    styleUrls: [],
    styles: [`
      .badge-official { @apply bg-blue-100 text-blue-800; }
      .badge-practice { @apply bg-green-100 text-green-800; }
      .badge-live { @apply bg-red-100 text-red-800; }
      .badge-strict { @apply bg-purple-100 text-purple-800; }
    `],
    imports: [CommonModule, RouterModule]
})
export class TestListComponent implements OnInit {
  series: TestSeries[] = [];
  groupedSeries: GroupedTests[] = [];
  now = new Date();
  activeFamily: string | null = null;
  isAccountExpired: boolean = false;
  isLoadingAccountStatus: boolean = true;

  constructor(
    private svc: TestService, 
    private router: Router, 
    public authService: AuthService, 
    private notificationService: NotificationService // Inject NotificationService
  ) {}

  ngOnInit() {
    this.checkAccountStatus().subscribe(() => {
      this.isLoadingAccountStatus = false;
      // Proceed to load test series after account status is known
      this.svc.getSeries().subscribe(data => {
        this.series = data;
        this.groupTestsByFamily();
        
        // Check if there's a hash in the URL and navigate to that family
        setTimeout(() => {
          const hash = window.location.hash;
          if (hash && hash.startsWith('#family-')) {
            const familyId = hash.replace('#family-', '');
            this.setActiveFamily(familyId);
          } else if (this.groupedSeries.length > 0) {
            // Set the first family as active by default
            this.activeFamily = this.groupedSeries[0].familyId;
          }
        }, 100);
      });
    });
  }

  checkAccountStatus(): Observable<void> {
    if (this.authService.getRole() === 'student') {
      const accountExpiresAt = this.authService.getAccountExpiresAt();
      if (accountExpiresAt) {
        this.isAccountExpired = new Date(accountExpiresAt) < new Date();
        return of(undefined);
      } else {
        // If not in local storage, refresh profile
        return this.authService.refreshUserProfile().pipe(
          map(user => {
            if (user.accountExpiresAt) {
              this.isAccountExpired = new Date(user.accountExpiresAt) < new Date();
            }
          }),
          catchError((err: any) => { // Add type for err
            console.error('Failed to refresh user profile for account status', err);
            this.notificationService.showError('Failed to load account status. Please try again later.'); // Use NotificationService
            this.isAccountExpired = false; // Default to not expired on error to avoid blocking unnecessarily
            return of(undefined);
          })
        );
      }
    } else {
      this.isAccountExpired = false; // Not a student, so account expiry doesn't apply in this context
      return of(undefined);
    }
  }

  // Group tests by exam family
  groupTestsByFamily() {
    // Create a map to store tests by family ID
    const familyMap = new Map<string, GroupedTests>();
    
    // Group tests by family
    this.series.forEach(test => {
      if (test.family && test.family._id) {
        if (!familyMap.has(test.family._id)) {
          familyMap.set(test.family._id, {
            familyId: test.family._id,
            familyName: test.family.name || 'Unknown Family',
            familyCode: test.family.code || '',
            tests: []
          });
        }
        familyMap.get(test.family._id)?.tests.push(test);
      } else {
        // Handle tests without a family
        if (!familyMap.has('uncategorized')) {
          familyMap.set('uncategorized', {
            familyId: 'uncategorized',
            familyName: 'Uncategorized',
            familyCode: '',
            tests: []
          });
        }
        familyMap.get('uncategorized')?.tests.push(test);
      }
    });
    
    // Convert map to array
    this.groupedSeries = Array.from(familyMap.values());
    
    // Sort by family name
    this.groupedSeries.sort((a, b) => {
      // Put uncategorized at the end
      if (a.familyId === 'uncategorized') return 1;
      if (b.familyId === 'uncategorized') return -1;
      return a.familyName.localeCompare(b.familyName);
    });
  }

  // Navigate to the player
  startSeries(s: TestSeries) {
    if (this.authService.getRole() === 'student' && this.isAccountExpired) {
      // Optionally, navigate to profile or show a more prominent message
      this.router.navigate(['/profile'], { queryParams: { accountExpired: 'true' } });
      return;
    }
    this.router.navigate(['/exam', s._id]);
  }
  // Disable only for 'live' tests outside their window OR if student account is expired
  isSeriesDisabled(s: TestSeries): boolean {
    if (this.authService.getRole() === 'student' && this.isAccountExpired) {
      return true;
    }
    if (s.mode === 'live') {
      const start = new Date(s.startAt);
      const end   = new Date(s.endAt);
      return this.now < start || this.now > end;
    }
    // practice, official, and strict modes are always enabled (unless account expired)
    return false;
  }
  // Only 'live' tests have reasons to disable, or account expiry
  getDisabledReason(s: TestSeries): string {
    if (this.authService.getRole() === 'student' && this.isAccountExpired) {
      return 'Your account has expired. Please renew your subscription.';
    }
    if (s.mode === 'live') {
      const start = new Date(s.startAt);
      const end   = new Date(s.endAt);
      if (this.now < start) return 'Not started yet';
      if (this.now > end)   return 'Test has ended';
    }
    return '';
  }  // CSS class for badges
  modeClass(mode: string): string {
    return {
      official:  'badge-official',
      practice:  'badge-practice',
      live:      'badge-live',
      strict:    'badge-strict'
    }[mode] || '';
  }

  // Set active family and handle navigation
  setActiveFamily(familyId: string, event?: MouseEvent): void {
    if (event) {
      // Prevent default only if needed for smooth scrolling
      event.preventDefault();
    }
    
    this.activeFamily = familyId;
    
    // Scroll to the family section with smooth behavior
    const element = document.getElementById('family-' + familyId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
      
      // Update the URL with the hash without causing a page reload
      if (history.pushState) {
        history.pushState(null, '', '#family-' + familyId);
      }
    }
  }

  // Check if any tests in the group are live mode
  hasLiveTests(tests: TestSeries[]): boolean {
    return tests.some(test => test.mode === 'live');
  }
}
