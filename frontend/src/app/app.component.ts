import { Component, OnInit, NgZone, OnDestroy, HostListener } from '@angular/core';
import { RouterOutlet, Router, RouterModule, NavigationEnd, ActivatedRoute } from '@angular/router'; // Import ActivatedRoute
import { AuthService } from './services/auth.service';
import { FirebaseAuthService } from './services/firebase-auth.service';
import { ReferralService } from './services/referral.service'; // Import ReferralService
import { StreakService, StreakStats } from './services/streak.service'; // Import StreakService
import { RewardService, RewardSummary } from './services/reward.service'; // Import RewardService
import { Observable, Subscription, interval } from 'rxjs';
import { filter, switchMap, startWith } from 'rxjs/operators'; // Import filter operator
import { User as FirebaseUser } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';
import { GlobalChatComponent } from './components/global-chat/global-chat.component'; // Import GlobalChatComponent

@Component({
    selector: 'app-root',
    imports: [
        RouterOutlet,
        RouterModule,
        CommonModule,
        GlobalChatComponent // Add GlobalChatComponent to imports
    ], templateUrl: './app.component.html',
    styles: [`
      .animate-slideDown {
        animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-12px) scale(0.95);
          max-height: 0;
          visibility: hidden;
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
          max-height: 500px;
          visibility: visible;
        }
      }
      
      .rotate-180 {
        transform: rotate(180deg);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .streak-dropdown {
        backdrop-filter: blur(10px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 
                    0 10px 10px -5px rgba(0, 0, 0, 0.04),
                    0 0 0 1px rgba(255, 255, 255, 0.1);
        border-top: 2px solid rgba(59, 130, 246, 0.3);
      }
      
      .streak-item {
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .streak-item:hover {
        transform: translateX(4px);
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
      }
      
      .points-glow {
        text-shadow: 0 0 10px rgba(234, 179, 8, 0.3);
      }
      
      .streak-badge-glow {
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
      }
      
      .mobile-streak-card {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 0.9));
        backdrop-filter: blur(10px);
      }
      
      .mobile-streak-item {
        backdrop-filter: blur(8px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .mobile-streak-item:hover {
        transform: scale(1.02);
      }
      
      .dropdown-container {
        position: relative;
        z-index: 1000;
      }
      
      .action-button {
        min-height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `]
})
export class AppComponent implements OnInit, OnDestroy {
  currentUser$: Observable<FirebaseUser | null>;
  isAppLoggedIn: boolean = false;
  appUserDisplayName: string | null = null;
  userRole: string | null = null; // Add userRole property
  currentRoute: string = ''; // Add property to track current route
  mobileMenuOpen: boolean = false; // Add mobile menu state
  
  // Streak and reward tracking
  streakStats: StreakStats | null = null;
  rewardSummary: RewardSummary | null = null;
  
  // Dropdown state management
  showStreakDropdown = false;
  showMobileStreakDropdown = false;
  
  private subscriptions: Subscription[] = [];
  private refreshInterval: Subscription | null = null;
  
  constructor(
    public authService: AuthService, 
    private firebaseAuthService: FirebaseAuthService,
    private router: Router,
    private ngZone: NgZone,
    private activatedRoute: ActivatedRoute,
    private referralService: ReferralService,
    private streakService: StreakService,
    private rewardService: RewardService 
  ) {
    this.currentUser$ = this.firebaseAuthService.currentUser$;
  }
  ngOnInit() {
    console.log('AppComponent: ngOnInit started.');
    
    // Check for referral code in URL parameters
    this.activatedRoute.queryParams.subscribe(params => {
      const referralCode = params['ref'];
      if (referralCode) {
        console.log('AppComponent: Referral code found in URL:', referralCode);
        this.referralService.setReferralCode(referralCode);
        
        // Remove the referral code from URL to clean it up
        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: { ref: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
    });
    
    // Subscribe to Firebase user state changes
    this.currentUser$.subscribe(fbUser => {
      this.ngZone.run(() => { 
        console.log('AppComponent: currentUser$ emitted. Firebase User:', fbUser ? fbUser.uid : 'null');
        this.updateAuthStates('currentUser$ event');
      });
    });    // Subscribe to router navigation end events
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.ngZone.run(() => {
        console.log('AppComponent: NavigationEnd event. URL:', event.urlAfterRedirects);
        this.currentRoute = event.urlAfterRedirects; // Update current route
        this.updateAuthStates('NavigationEnd event');
      });
    });    // Initial state check
    // This will run once when the component is initialized.
    // If there's an immediate redirect (e.g. from '/' to '/login'),
    // NavigationEnd might fire very soon after/before this, leading to multiple calls.
    // The updateAuthStates logic should be idempotent.
    this.ngZone.run(() => {
        console.log('AppComponent: ngOnInit initial direct call to updateAuthStates.');
        this.currentRoute = this.router.url; // Initialize current route
        this.updateAuthStates('ngOnInit initial');
    });
    console.log('AppComponent: ngOnInit finished setting up subscriptions and initial call.');
  }
  updateAuthStates(caller: string) {
    console.log(`AppComponent: updateAuthStates called by: ${caller}`);
    const appIsLoggedInOld = this.isAppLoggedIn;
    const appUserDisplayNameOld = this.appUserDisplayName;

    const appIsLoggedInNew = this.authService.isLoggedIn();
    this.isAppLoggedIn = appIsLoggedInNew;
    this.userRole = this.authService.getRole(); // Set user role

    if (appIsLoggedInNew) {
      const fbUser = this.firebaseAuthService.getCurrentUser(); 
      if (fbUser) {
        this.appUserDisplayName = fbUser.displayName || fbUser.email;
      } else {
        // No Firebase user, but app is logged in (traditional)
        this.appUserDisplayName = this.authService.getAppUserName() || this.authService.getEmail() || 'User';
      }
    } else {
      this.appUserDisplayName = null;
    }
    
    if (appIsLoggedInOld !== this.isAppLoggedIn || appUserDisplayNameOld !== this.appUserDisplayName) {
        console.log(
            `AppComponent: updateAuthStates - STATE CHANGED by ${caller}. ` +
            `isAppLoggedIn: ${appIsLoggedInOld} -> ${this.isAppLoggedIn}, ` +
            `appUserDisplayName: '${appUserDisplayNameOld}' -> '${this.appUserDisplayName}'`
        );
        
        // Load streak and reward data when user logs in
        if (this.isAppLoggedIn && !appIsLoggedInOld) {
          this.loadStreakAndRewardData();
          this.startPeriodicRefresh();
        }
        
        // Clear data when user logs out
        if (!this.isAppLoggedIn && appIsLoggedInOld) {
          this.streakStats = null;
          this.rewardSummary = null;
          // Cleanup subscriptions
          this.subscriptions.forEach(sub => sub.unsubscribe());
          this.subscriptions = [];
          if (this.refreshInterval) {
            this.refreshInterval.unsubscribe();
            this.refreshInterval = null;
          }
        }
    } else {
        console.log(
            `AppComponent: updateAuthStates - NO STATE CHANGE by ${caller}. ` +
            `isAppLoggedIn: ${this.isAppLoggedIn}, ` +
            `appUserDisplayName: '${this.appUserDisplayName}'`
        );
    }
  }

  async logout() {
    console.log('AppComponent: Logout initiated.');
    const fbUser = this.firebaseAuthService.getCurrentUser();
    if (fbUser) {
      console.log('AppComponent: Firebase user exists, calling signOutFirebase.');
      await this.firebaseAuthService.signOutFirebase();
      // onAuthStateChanged in FirebaseAuthService (which calls authService.logout())
      // AND currentUser$ subscription in this component will trigger updateAuthStates.
    } else if (this.authService.isLoggedIn()) {
      console.log('AppComponent: No Firebase user but app is logged in (traditional), calling authService.logout().');
      this.authService.logout(); // This navigates to /login
      // The NavigationEnd event from logout's navigation should trigger updateAuthStates.
      // Forcing an update here as a safeguard, though ideally NavigationEnd handles it.
      this.ngZone.run(() => {
         console.log('AppComponent: Traditional logout, explicitly calling updateAuthStates post authService.logout().');
         this.updateAuthStates('logout traditional direct');
      });
    } else {
      console.log('AppComponent: Logout called but no Firebase user and not logged into app. Forcing state update.');
       this.ngZone.run(() => {
            this.updateAuthStates('logout no_active_session');        });
    }
  }

  // Method to determine if chat should be displayed
  shouldDisplayChat(): boolean {
    // Hide chat on login page and during exam attempts
    const hideChatRoutes = ['/login', '/register'];
    
  // Check if current route is login or register
    if (hideChatRoutes.includes(this.currentRoute)) {
      return false;
    }
    
    // Check if current route is an exam (starts with /exam/)
    if (this.currentRoute.startsWith('/exam/')) {
      return false;
    }
    
    // Show chat on all other pages
    return true;
  }

  // Mobile menu methods
  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    this.showMobileStreakDropdown = false; // Close streak dropdown when closing mobile menu
  }
  
  ngOnDestroy(): void {
    // Cleanup subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
    }
  }

  private loadStreakAndRewardData(): void {
    if (!this.isAppLoggedIn) {
      this.streakStats = null;
      this.rewardSummary = null;
      return;
    }

    // Load streak statistics
    this.subscriptions.push(
      this.streakService.getStreakStats().subscribe({
        next: (response) => {
          if (response.success) {
            this.streakStats = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading streak stats:', error);
        }
      })
    );

    // Load reward summary
    this.subscriptions.push(
      this.rewardService.getUserRewardDashboard().subscribe({
        next: () => {
          // Data is available through the service's observable
        },
        error: (error) => {
          console.error('Error loading reward summary:', error);
        }
      })
    );

    // Subscribe to reward summary from service
    this.subscriptions.push(
      this.rewardService.rewardSummary$.subscribe(summary => {
        this.rewardSummary = summary;
      })
    );
  }

  private startPeriodicRefresh(): void {
    // Refresh streak and reward data every 5 minutes
    this.refreshInterval = interval(5 * 60 * 1000).pipe(
      startWith(0), // Start immediately
      filter(() => this.isAppLoggedIn),
      switchMap(() => this.streakService.getStreakStats())
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.streakStats = response.data;
        }
      },
      error: (error) => {
        console.error('Error refreshing streak stats:', error);
      }
    });
  }

  getStreakStatusColor(streak: number): string {
    if (streak === 0) return 'text-gray-400';
    if (streak < 3) return 'text-yellow-400';
    if (streak < 7) return 'text-orange-400';
    return 'text-green-400';
  }

  getStreakStatusIcon(streak: number): string {
    if (streak === 0) return '⚪';
    if (streak < 3) return '🔥';
    if (streak < 7) return '🚀';
    return '⭐';
  }

  // Helper methods for streak display
  navigateToRewards(): void {
    this.router.navigate(['/rewards']);
  }

  formatPoints(points: number): string {
    if (points >= 1000000) {
      return (points / 1000000).toFixed(1) + 'M';
    } else if (points >= 1000) {
      return (points / 1000).toFixed(1) + 'K';
    }
    return points.toString();
  }

  // Dropdown toggle methods
  toggleStreakDropdown(): void {
    this.showStreakDropdown = !this.showStreakDropdown;
  }

  toggleMobileStreakDropdown(): void {
    this.showMobileStreakDropdown = !this.showMobileStreakDropdown;
  }

  // Close dropdowns when clicking outside or navigating
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.showStreakDropdown = false;
    }
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    // You can implement a toast notification system here
    console.log(`${type.toUpperCase()}: ${message}`);
  }
}
