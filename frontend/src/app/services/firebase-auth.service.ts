import { Injectable, NgZone } from '@angular/core'; // Import NgZone
import { Auth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser, AuthError } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http'; // For backend communication
import { AuthService } from './auth.service'; // Import AuthService
import { ReferralService } from './referral.service'; // Import ReferralService

interface BackendUser { // Duplicating from AuthService for clarity, consider a shared types file
  _id: string;
  email: string;
  name: string;
  role: string;
  photoURL?: string;
}

interface FirebaseSignInResponse { // Duplicating from AuthService for clarity
  token: string;
  user?: BackendUser;  // Make user optional
  // Additional fields that might be in the response
  userId?: string;
  name?: string;
  displayName?: string;
  email?: string;
  role?: string;
  photoURL?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {  private userSubject = new BehaviorSubject<FirebaseUser | null>(null);
  currentUser$: Observable<FirebaseUser | null> = this.userSubject.asObservable();
  private backendUrl = 'http://localhost:5000/api/auth'; // Adjust if your backend URL is different

  private firebaseUserJustSignedOut = false; // Flag to track explicit Firebase sign-out
  private tempReferralCode: string | null = null; // Store referral code during Firebase auth process
  constructor(
    private fireAuth: Auth,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService, // Inject AuthService
    private ngZone: NgZone, // Inject NgZone
    private referralService: ReferralService // Inject ReferralService
  ) {
    onAuthStateChanged(this.fireAuth, async (user) => {
      this.ngZone.run(async () => { // Run callback in Angular's zone
        console.log('FirebaseAuthService: onAuthStateChanged triggered. Firebase User:', user ? user.uid : 'null');
        this.userSubject.next(user);          if (user) {
          this.firebaseUserJustSignedOut = false; // Reset flag on user presence
          // User is signed in with Firebase
          try {
            const idToken = await user.getIdToken();
            console.log('FirebaseAuthService: Firebase ID token obtained. Calling backend /firebase-signin.');
            
            // Get referral code from stored temp value or from service
            const referralCode = this.tempReferralCode || this.referralService.getReferralCode();
            
            // Prepare the request payload
            const payload: any = { firebaseToken: idToken };
            if (referralCode) {
              payload.referralCodeInput = referralCode;
              console.log('FirebaseAuthService: Including referral code in Firebase sign-in:', referralCode);
            }
            
            // Send token to backend to create/verify user and get app-specific token/session
            this.http.post<FirebaseSignInResponse>(`${this.backendUrl}/firebase-signin`, payload)
              .subscribe({                next: (response: FirebaseSignInResponse) => {
                  console.log('FirebaseAuthService: Backend /firebase-signin SUCCESS.', response);
                  
                  // Clear referral codes after successful authentication
                  this.tempReferralCode = null;
                  this.referralService.clearReferralCode();
                  
                  // Create a user object if it doesn't exist in the response
                  const userObj: BackendUser = response.user || {
                    _id: response.userId || '',
                    email: response.email || '',
                    name: response.name || response.displayName || '',
                    role: response.role || 'student', // Default to student if role is missing
                    photoURL: response.photoURL
                  };
                    // Use AuthService to handle storing app token and user object
                  this.authService.handleFirebaseLogin(response.token, userObj);
                    // Only navigate if we're on the login page or a page that requires authentication but doesn't exist
                  const currentUrl = this.router.url;
                  if (currentUrl === '/login') {
                    // Redirect all users to home page instead of role-based dashboards
                    console.log('FirebaseAuthService: Navigating from login to /home');
                    this.router.navigate(['/home'])
                      .then(navSuccess => {
                        console.log(`FirebaseAuthService: Navigation to /home status: ${navSuccess}`);
                        if (!navSuccess) {
                          console.error('FirebaseAuthService: Navigation failed silently. Check router configuration and guards.');
                        }
                      })
                      .catch(err => console.error('FirebaseAuthService: Navigation to /home ERROR:', err));
                  } else {
                    console.log(`FirebaseAuthService: Staying on current page: ${currentUrl}`);
                  }
                },
                error: (err: HttpErrorResponse) => {
                  console.error('FirebaseAuthService: Backend /firebase-signin FAILED:', err);
                  alert(err.error?.message || err.message || 'Firebase sign-in with backend failed.');
                  this.signOutFirebase(); // Attempt to sign out from Firebase to clear its state if backend fails
                  console.log('FirebaseAuthService: Attempting Firebase sign-out due to backend failure.');
                }
              });
          } catch (error: any) { // Catch for getIdToken or other unexpected issues
            console.error('FirebaseAuthService: Error during Firebase ID token retrieval or backend sign-in process:', error);
            alert(error.message || 'An unexpected error occurred during sign-in.');
            this.signOutFirebase(); // Attempt to sign out
            console.log('FirebaseAuthService: Attempting Firebase sign-out due to error in process.');
          }
        } else { // Firebase user is null
          console.log('FirebaseAuthService: Firebase user is null.');
          // this.userSubject.next(null); // Already done at the start of ngZone.run or implicitly by user being null

          if (this.firebaseUserJustSignedOut) {
            console.log('FirebaseAuthService: Firebase user is null AND firebaseUserJustSignedOut is true.');
            // This means Firebase sign-out was explicitly called (e.g., user clicked Firebase logout)
            // or a Firebase sign-in attempt failed and triggered a cleanup via signOutFirebase().
            if (this.authService.isLoggedIn()) {
              console.log('FirebaseAuthService: App token exists, calling authService.logout().');
              this.authService.logout(); // Clear app token and navigate to login
            }
            this.firebaseUserJustSignedOut = false; // Reset flag
          } else {
            console.log('FirebaseAuthService: Firebase user is null, firebaseUserJustSignedOut is false (initial load, external expiry, or traditional login).');
            // Firebase user is null, and it wasn't due to an explicit Firebase sign-out action
            // This could be:
            // 1. Initial load, no Firebase user was ever logged in.
            // 2. Firebase session expired externally.
            // 3. User is using traditional login (no Firebase user involved).
            // In these cases, we should NOT automatically log out an existing app session.
            // We only navigate to /login if there's NO app session AND user is not on a public page.
            if (!this.authService.isLoggedIn()) {
              const currentUrl = this.router.url;
              // Assuming '/' redirects to '/login' or is a public landing.
              // Leaderboard is also public.
              const publicPaths = ['/login', '/register', '/']; 
              const isPublicLeaderboard = currentUrl.startsWith('/leaderboard/');
              console.log(`FirebaseAuthService: No app token. Current URL: ${currentUrl}. Is public leaderboard: ${isPublicLeaderboard}`);
              
              if (!publicPaths.includes(currentUrl) && !isPublicLeaderboard) {
                const currentNavigation = this.router.getCurrentNavigation();
                if (!currentNavigation || currentNavigation.finalUrl?.toString() !== '/login') {
                  console.log('FirebaseAuthService: Not on a public page and no app token, navigating to /login.');
                  this.router.navigate(['/login']);
                }
              }
            } else {
              console.log('FirebaseAuthService: App token exists, not navigating (could be traditional login session).');
            }
          }
        }
      }); // End of ngZone.run
    });
  }  async googleSignIn(referralCode?: string): Promise<void> {
    // Store referral code temporarily for the authentication process
    if (referralCode) {
      this.tempReferralCode = referralCode;
    }
    
    const provider = new GoogleAuthProvider();
    
    // Add additional scopes if needed
    provider.addScope('profile');
    provider.addScope('email');
    
    // Set custom parameters
    provider.setCustomParameters({
      prompt: 'select_account' // Force account selection even if user is already signed in
    });
    
    try {
      console.log('FirebaseAuthService: Initiating Google Sign-In with popup.');
      await signInWithPopup(this.fireAuth, provider);
      console.log('FirebaseAuthService: Google Sign-In popup successful. onAuthStateChanged will handle the rest.');
    } catch (error: any) {
      // Clear temp referral code on error
      this.tempReferralCode = null;
      console.error('Google Sign-In failed:', error);
      const authError = error as AuthError;
      alert(authError.message || 'Google Sign-In was unsuccessful.');
      throw authError;
    }
  }

  async signOutFirebase(): Promise<void> {
    try {
      console.log('FirebaseAuthService: signOutFirebase called. Setting firebaseUserJustSignedOut = true.');
      this.firebaseUserJustSignedOut = true; // Set flag BEFORE calling signOut
      await signOut(this.fireAuth);
      console.log('FirebaseAuthService: Firebase signOut successful. onAuthStateChanged will be triggered.');
      // onAuthStateChanged will be triggered.
      // If an app session exists, it will call authService.logout()
      // because firebaseUserJustSignedOut is true.
    } catch (error: any) {
      this.firebaseUserJustSignedOut = false; // Reset flag on error during signout itself
      console.error('Sign out failed:', error);
      const authError = error as AuthError;
      alert(authError.message || 'Sign out failed.');
    }
  }

  getCurrentUser(): FirebaseUser | null {
    return this.fireAuth.currentUser;
  }

  isLoggedIn(): Observable<boolean> {
    return new Observable(observer => {
      // This reflects Firebase auth state, not necessarily app token state
      onAuthStateChanged(this.fireAuth, user => {
        observer.next(!!user);
      });
    });
  }

  async getIdToken(): Promise<string | null> {
    const user = this.getCurrentUser();
    if (user) {
      return await user.getIdToken();
    }
    return null;
  }
}
