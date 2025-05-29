/**
 * @fileoverview Authentication Service for NexPrep Admin Panel
 * @description Provides comprehensive authentication and authorization functionality including
 * user login, logout, token management, role-based access control, and user session management.
 * @module AuthService
 * @requires @angular/core
 * @requires @angular/common/http
 * @requires rxjs
 * @requires environment
 * @author NexPrep Development Team
 * @since 1.0.0
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * @interface AuthResponse
 * @description Response interface for authentication operations
 */
interface AuthResponse { 
  /** JWT authentication token */
  token: string; 
  /** User role (admin, moderator, etc.) */
  role: string; 
  /** User's display name */
  name: string; // Added name field
  /** Unique user identifier */
  userId: string; // Assuming userId is also useful
}

/**
 * @class AuthService
 * @description Angular service for managing authentication and authorization in the NexPrep admin panel.
 * Handles user login/logout, token management, role-based access control, and session persistence.
 * 
 * @example
 * ```typescript
 * constructor(private authService: AuthService) {}
 * 
 * // User login
 * this.authService.login('admin@nexprep.com', 'password').subscribe({
 *   next: (response) => {
 *     console.log('Login successful:', response.name);
 *     this.router.navigate(['/dashboard']);
 *   },
 *   error: (error) => console.error('Login failed:', error)
 * });
 * 
 * // Check authentication status
 * if (this.authService.isLoggedIn()) {
 *   const userRole = this.authService.getUserRole();
 *   console.log('User is authenticated with role:', userRole);
 * }
 * 
 * // Subscribe to user name changes
 * this.authService.getUserNameObservable().subscribe(name => {
 *   this.currentUserName = name;
 * });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /** @private Base authentication API URL */
  private apiUrl = environment.apiUrl + '/auth';
  /** @private BehaviorSubject for reactive user role management */
  private role$  = new BehaviorSubject<string | null>(localStorage.getItem('role'));
  /** @private BehaviorSubject for reactive user name management */
  private userName$ = new BehaviorSubject<string | null>(localStorage.getItem('userName')); // Added for user name

  /**
   * @constructor
   * @description Initializes the AuthService with HTTP client dependency
   * @param {HttpClient} http - Angular HTTP client for API communication
   */
  constructor(private http: HttpClient) {}
  /**
   * @method register
   * @description Registers a new user in the system
   * @param {Object} data - User registration data
   * @param {string} data.username - Unique username for the new user
   * @param {string} data.email - Email address of the new user
   * @param {string} data.password - Password for the new user account
   * @param {string} [data.role] - Optional role assignment (defaults to basic user)
   * @returns {Observable<any>} Observable containing registration response
   * @throws {HttpErrorResponse} When registration fails due to validation errors or duplicate users
   * 
   * @example
   * ```typescript
   * const userData = {
   *   username: 'newadmin',
   *   email: 'newadmin@nexprep.com',
   *   password: 'securePassword123',
   *   role: 'admin'
   * };
   * 
   * this.authService.register(userData).subscribe({
   *   next: (response) => console.log('User registered successfully:', response),
   *   error: (error) => console.error('Registration failed:', error)
   * });
   * ```
   */
  register(data: { username: string; email: string; password: string; role?: string }) {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  /**
   * @method login
   * @description Authenticates a user and establishes a session
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Observable<AuthResponse>} Observable containing authentication response with token and user details
   * @throws {HttpErrorResponse} When authentication fails due to invalid credentials
   * 
   * @example
   * ```typescript
   * this.authService.login('admin@nexprep.com', 'password123').subscribe({
   *   next: (response) => {
   *     console.log('Login successful for:', response.name);
   *     console.log('User role:', response.role);
   *     this.router.navigate(['/dashboard']);
   *   },
   *   error: (error) => {
   *     console.error('Login failed:', error);
   *     this.showErrorMessage('Invalid email or password');
   *   }
   * });
   * ```
   */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('role',  res.role);
        localStorage.setItem('userName', res.name); // Store user's name
        localStorage.setItem('userId', res.userId); // Store userId
        this.role$.next(res.role);
        this.userName$.next(res.name); // Update BehaviorSubject
      }));
  }

  /**
   * @method logout
   * @description Logs out the current user and clears all session data
   * @returns {void}
   * 
   * @example
   * ```typescript
   * this.authService.logout();
   * console.log('User logged out successfully');
   * this.router.navigate(['/login']);
   * ```
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName'); // Clear user's name
    localStorage.removeItem('userId');
    this.role$.next(null);
    this.userName$.next(null); // Update BehaviorSubject
  }

  /**
   * @method isLoggedIn
   * @description Checks if a user is currently authenticated
   * @returns {boolean} True if user is logged in, false otherwise
   * 
   * @example
   * ```typescript
   * if (this.authService.isLoggedIn()) {
   *   console.log('User is authenticated');
   *   this.loadUserData();
   * } else {
   *   console.log('User not authenticated');
   *   this.router.navigate(['/login']);
   * }
   * ```
   */
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  /**
   * @method getToken
   * @description Retrieves the current authentication token
   * @returns {string|null} JWT token if user is logged in, null otherwise
   * 
   * @example
   * ```typescript
   * const token = this.authService.getToken();
   * if (token) {
   *   console.log('Token available for API requests');
   *   // Use token for authenticated API calls
   * } else {
   *   console.log('No token available - user not authenticated');
   * }
   * ```
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }  /**
   * @method getUserRole
   * @description Retrieves the current user's role
   * @returns {string|null} User role string if logged in, null otherwise
   * 
   * @example
   * ```typescript
   * const userRole = this.authService.getUserRole();
   * if (userRole === 'admin') {
   *   console.log('User has admin privileges');
   *   this.showAdminMenu();
   * } else if (userRole === 'moderator') {
   *   console.log('User has moderator privileges');
   *   this.showModeratorMenu();
   * }
   * ```
   */
  getUserRole(): string | null {
    return localStorage.getItem('role');
  }
  
  /**
   * @method getRole
   * @description Alias for getUserRole method for backward compatibility
   * @returns {string|null} User role string if logged in, null otherwise
   * @deprecated Use getUserRole() instead
   * 
   * @example
   * ```typescript
   * // Deprecated - use getUserRole() instead
   * const role = this.authService.getRole();
   * ```
   */
  // Alias for getUserRole for backward compatibility
  getRole(): string | null {
    return this.getUserRole();
  }

  /**
   * @method getUserName
   * @description Retrieves the current user's display name
   * @returns {string|null} User name if logged in, null otherwise
   * 
   * @example
   * ```typescript
   * const userName = this.authService.getUserName();
   * if (userName) {
   *   this.welcomeMessage = `Welcome back, ${userName}!`;
   * }
   * ```
   */
  getUserName(): string | null {
    return localStorage.getItem('userName');
  }
  
  /**
   * @method getUserId
   * @description Retrieves the current user's unique identifier
   * @returns {string|null} User ID if logged in, null otherwise
   * 
   * @example
   * ```typescript
   * const userId = this.authService.getUserId();
   * if (userId) {
   *   this.loadUserSpecificData(userId);
   * }
   * ```
   */
  getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  /**
   * @method getUserNameObservable
   * @description Returns an observable for reactive user name changes
   * @returns {Observable<string|null>} Observable that emits user name changes
   * 
   * @example
   * ```typescript
   * ngOnInit() {
   *   this.authService.getUserNameObservable().subscribe(name => {
   *     this.currentUserName = name;
   *     if (name) {
   *       this.updateUserInterface();
   *     }
   *   });
   * }
   * ```
   */
  getUserNameObservable(): Observable<string | null> {
    return this.userName$.asObservable();
  }
}
