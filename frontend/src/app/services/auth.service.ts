/**
 * @fileoverview Authentication service for NexPrep platform providing comprehensive user authentication,
 * authorization, and session management capabilities. Supports traditional email/password login,
 * Firebase authentication integration, user registration, and secure token-based sessions.
 * 
 * Features:
 * - Traditional email/password authentication
 * - Firebase authentication integration
 * - User registration with referral support
 * - Secure JWT token management
 * - Role-based access control
 * - Session persistence and cleanup
 * - User profile information management
 * - Referral system integration
 * 
 * @version 1.0.0
 * @author NexPrep Development Team
 * @since 2023
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

/**
 * @interface AuthResponse
 * @description Response structure from authentication endpoints
 * 
 * @property {string} token - JWT authentication token
 * @property {string} role - User role (student, admin, instructor)
 * @property {string} [name] - User's display name (optional)
 * @property {string} [email] - User's email address (optional)
 */
interface AuthResponse { 
  token: string; 
  role: string; 
  name?: string; // Added
  email?: string; // Added
}

/**
 * @interface BackendUser
 * @description User object structure returned from backend services
 * 
 * @property {string} _id - Unique user identifier
 * @property {string} email - User's email address
 * @property {string} name - User's display name
 * @property {string} role - User role in the system
 * @property {string} [photoURL] - User's profile picture URL (optional)
 */
interface BackendUser { // Define a more specific type for the user object from backend
  _id: string;
  email: string;
  name: string;
  role: string;
  photoURL?: string;
  // Add other fields your backend user object might have
}

/**
 * @interface FirebaseSignInResponse
 * @description Response structure from Firebase authentication integration
 * 
 * @property {string} token - Backend JWT token after Firebase verification
 * @property {BackendUser} user - Complete user object from backend
 */
interface FirebaseSignInResponse {
  token: string;
  user: BackendUser;
}

/**
 * @class AuthService
 * @description Core authentication service managing user sessions, login/logout operations,
 * and integration with Firebase authentication. Handles secure token storage, role-based
 * access control, and user profile management across the NexPrep platform.
 * 
 * @implements Injectable
 * 
 * Key Responsibilities:
 * - User authentication and authorization
 * - Session management and token handling
 * - Firebase authentication integration
 * - User registration with referral support
 * - Role-based navigation and access control
 * - Secure storage of user credentials
 * 
 * @example
 * ```typescript
 * // Inject service and use for authentication
 * constructor(private authService: AuthService) {}
 * 
 * // Traditional login
 * this.authService.login(email, password).subscribe(
 *   response => console.log('Login successful'),
 *   error => console.error('Login failed')
 * );
 * 
 * // Check authentication status
 * if (this.authService.isLoggedIn()) {
 *   const userRole = this.authService.getRole();
 *   console.log(`User role: ${userRole}`);
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /** @property {string} Base URL for authentication API endpoints */
  private base = 'http://localhost:5000/api/auth';

  /**
   * @constructor
   * @description Initializes AuthService with required dependencies for HTTP operations and routing.
   * 
   * @param {HttpClient} http - Angular HTTP client for API communications
   * @param {Router} router - Angular router for navigation management
   */
  constructor(private http: HttpClient, private router: Router) {}
  /**
   * @method login
   * @description Authenticates user with email and password credentials. Stores authentication
   * token and user information in local storage upon successful login.
   * 
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Observable<AuthResponse>} Observable containing authentication response
   * 
   * @example
   * ```typescript
   * this.authService.login('user@example.com', 'password123').subscribe({
   *   next: (response) => {
   *     console.log('Login successful:', response.role);
   *     // User is automatically redirected based on role
   *   },
   *   error: (error) => {
   *     console.error('Login failed:', error.message);
   *     // Handle login error (show message, etc.)
   *   }
   * });
   * ```
   */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, { email, password })
      .pipe(tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('role',  res.role);
        if (res.name) localStorage.setItem('appUserName', res.name); // Store name
        if (res.email) localStorage.setItem('appUserEmail', res.email); // Store email
        // Navigate after successful traditional login
        // this.router.navigate([this.getRedirectUrl(res.role)]); // Consider centralizing navigation
      }));
  }

  /**
   * @method handleFirebaseLogin
   * @description Processes successful Firebase authentication and stores backend token and user data.
   * Called after Firebase authentication is verified by backend services.
   * 
   * @param {string} token - Backend JWT token received after Firebase verification
   * @param {BackendUser} user - Complete user object from backend
   * 
   * @example
   * ```typescript
   * // Called by FirebaseAuthService after successful Firebase login
   * this.authService.handleFirebaseLogin(backendToken, userObject);
   * // Automatically stores token and user info in localStorage
   * // Sets up session for authenticated user
   * ```
   */
  // New method to handle successful Firebase sign-in & backend token exchange
  handleFirebaseLogin(token: string, user: BackendUser) {
    if (!user) {
      console.error("User object is undefined in handleFirebaseLogin");
      return;
    }
    
    localStorage.setItem('token', token);
    localStorage.setItem('role', user.role || 'student'); // Provide a default role if undefined
    if (user.name) localStorage.setItem('appUserName', user.name); // Also store for consistency
    if (user.email) localStorage.setItem('appUserEmail', user.email); // Also store for consistency
    // User object from backend might contain more details like name, photoURL, etc.
    // localStorage.setItem('userName', user.name); // Example
    // localStorage.setItem('userPhoto', user.photoURL || ''); // Example

    // Navigation should ideally happen here or be triggered from here
    // to ensure consistency after any successful login (Firebase or traditional).
    // For now, FirebaseAuthService handles navigation after Firebase login.
    // If you want to centralize it, FirebaseAuthService would call this method,
    // and this method would then navigate.
  }  /**
   * @method register
   * @description Registers new user account with optional referral code support.
   * Creates student account by default with provided credentials.
   * 
   * @param {string} name - User's full name
   * @param {string} username - Unique username for the account
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @param {string} [referralCode] - Optional referral code for bonus credits
   * @returns {Observable<any>} Observable containing registration response
   * 
   * @example
   * ```typescript
   * // Registration without referral code
   * this.authService.register('John Doe', 'johndoe', 'john@example.com', 'password123')
   *   .subscribe({
   *     next: () => console.log('Registration successful'),
   *     error: (error) => console.error('Registration failed:', error)
   *   });
   * 
   * // Registration with referral code
   * this.authService.register('Jane Doe', 'janedoe', 'jane@example.com', 'password123', 'REF123')
   *   .subscribe(() => console.log('Registration with referral successful'));
   * ```
   */
  register(name: string, username: string, email: string, password: string, referralCode?: string) { // Added optional referralCode parameter
    // student self-registration; always gets role=student
    const payload: any = { name, username, email, password };
    if (referralCode && referralCode.trim()) {
      payload.referralCodeInput = referralCode.trim();
    }
    return this.http.post(`${this.base}/register`, payload);
  }

  /**
   * @method logout
   * @description Logs out current user by clearing all authentication data from local storage
   * and redirecting to login page. Ensures complete session cleanup.
   * 
   * @example
   * ```typescript
   * // Called from logout button or menu
   * this.authService.logout();
   * // User is automatically redirected to login page
   * // All stored authentication data is cleared
   * ```
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('appUserName'); // Clear name
    localStorage.removeItem('appUserEmail'); // Clear email
    this.router.navigate(['/login']);
  }

  /**
   * @method isLoggedIn
   * @description Checks if user is currently authenticated by verifying token existence.
   * 
   * @returns {boolean} True if user is logged in, false otherwise
   * 
   * @example
   * ```typescript
   * if (this.authService.isLoggedIn()) {
   *   // User is authenticated, show protected content
   *   console.log('User is logged in');
   * } else {
   *   // Redirect to login or show public content
   *   this.router.navigate(['/login']);
   * }
   * ```
   */
  isLoggedIn() {
    return !!localStorage.getItem('token');
  }

  /**
   * @method getRole
   * @description Retrieves current user's role from local storage.
   * 
   * @returns {string | null} User role (student, admin, instructor) or null if not logged in
   * 
   * @example
   * ```typescript
   * const userRole = this.authService.getRole();
   * switch(userRole) {
   *   case 'admin':
   *     // Show admin dashboard
   *     break;
   *   case 'student':
   *     // Show student dashboard
   *     break;
   *   default:
   *     // Handle unknown or null role
   * }
   * ```
   */
  getRole() {
    return localStorage.getItem('role');
  }  /**
   * @method getAppUserName
   * @description Retrieves current user's display name from local storage.
   * 
   * @returns {string | null} User's name or null if not available
   * 
   * @example
   * ```typescript
   * const userName = this.authService.getAppUserName();
   * if (userName) {
   *   console.log(`Welcome, ${userName}!`);
   * }
   * ```
   */
  // New getter methods
  getAppUserName(): string | null {
    return localStorage.getItem('appUserName');
  }

  /**
   * @method getAppUserEmail
   * @description Retrieves current user's email address from local storage.
   * 
   * @returns {string | null} User's email or null if not available
   * 
   * @example
   * ```typescript
   * const userEmail = this.authService.getAppUserEmail();
   * console.log(`User email: ${userEmail}`);
   * // Used for profile display, account settings
   * ```
   */
  getAppUserEmail(): string | null {
    return localStorage.getItem('appUserEmail');
  }

  /**
   * @method getReferralInfo
   * @description Retrieves user's referral information including referral code and statistics.
   * 
   * @returns {Observable<any>} Observable containing referral information
   * 
   * @example
   * ```typescript
   * this.authService.getReferralInfo().subscribe({
   *   next: (referralData) => {
   *     console.log('Referral code:', referralData.code);
   *     console.log('Successful referrals:', referralData.count);
   *     console.log('Rewards earned:', referralData.rewards);
   *   },
   *   error: (error) => console.error('Failed to load referral info:', error)
   * });
   * ```
   */
  // Get user's referral information
  getReferralInfo() {
    return this.http.get(`${this.base}/referral-info`);
  }

  /**
   * @method applyReferralCode
   * @description Applies referral code to user's account for bonus credits or rewards.
   * 
   * @param {string} referralCode - Valid referral code to apply
   * @returns {Observable<any>} Observable containing application result
   * 
   * @example
   * ```typescript
   * this.authService.applyReferralCode('FRIEND123').subscribe({
   *   next: (result) => {
   *     console.log('Referral applied successfully:', result.message);
   *     console.log('Bonus credits earned:', result.credits);
   *   },
   *   error: (error) => {
   *     console.error('Referral application failed:', error.message);
   *     // Handle invalid code, already used, etc.
   *   }
   * });
   * ```
   */
  // Apply referral code after registration
  applyReferralCode(referralCode: string) {
    return this.http.post(`${this.base}/apply-referral-code`, { referralCode });
  }
}