import { Component, OnInit, NgZone } from '@angular/core';
import { RouterOutlet, Router, RouterModule, NavigationEnd } from '@angular/router'; // Import NavigationEnd
import { AuthService } from './services/auth.service';
import { FirebaseAuthService } from './services/firebase-auth.service';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators'; // Import filter operator
import { User as FirebaseUser } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  currentUser$: Observable<FirebaseUser | null>;
  isAppLoggedIn: boolean = false;
  appUserDisplayName: string | null = null;

  constructor(
    public authService: AuthService, 
    private firebaseAuthService: FirebaseAuthService,
    private router: Router,
    private ngZone: NgZone 
  ) {
    this.currentUser$ = this.firebaseAuthService.currentUser$;
  }

  ngOnInit() {
    console.log('AppComponent: ngOnInit started.');
    // Subscribe to Firebase user state changes
    this.currentUser$.subscribe(fbUser => {
      this.ngZone.run(() => { 
        console.log('AppComponent: currentUser$ emitted. Firebase User:', fbUser ? fbUser.uid : 'null');
        this.updateAuthStates('currentUser$ event');
      });
    });

    // Subscribe to router navigation end events
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.ngZone.run(() => {
        console.log('AppComponent: NavigationEnd event. URL:', event.urlAfterRedirects);
        this.updateAuthStates('NavigationEnd event');
      });
    });

    // Initial state check
    // This will run once when the component is initialized.
    // If there's an immediate redirect (e.g. from '/' to '/login'),
    // NavigationEnd might fire very soon after/before this, leading to multiple calls.
    // The updateAuthStates logic should be idempotent.
    this.ngZone.run(() => {
        console.log('AppComponent: ngOnInit initial direct call to updateAuthStates.');
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

    if (appIsLoggedInNew) {
      const fbUser = this.firebaseAuthService.getCurrentUser(); 
      if (fbUser) {
        this.appUserDisplayName = fbUser.displayName || fbUser.email;
      } else {
        // No Firebase user, but app is logged in (traditional)
        this.appUserDisplayName = this.authService.getAppUserName() || this.authService.getAppUserEmail() || 'User';
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
            this.updateAuthStates('logout no_active_session');
        });
    }
  }
}
