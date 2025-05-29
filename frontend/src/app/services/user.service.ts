/**
 * @fileoverview User profile management service for NexPrep platform providing comprehensive
 * user data operations including profile retrieval, updates, and referral information management.
 * Handles secure communication with backend user APIs and maintains user data consistency.
 * 
 * Features:
 * - User profile data retrieval and management
 * - Profile information updates with validation
 * - Referral system integration and tracking
 * - Secure API communication with authentication
 * - Type-safe data interfaces and error handling
 * 
 * @version 1.0.0
 * @author NexPrep Development Team
 * @since 2023
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * @interface ReferralInfo
 * @description Complete referral information structure for user referral tracking
 * 
 * @property {string} referralCode - User's unique referral code
 * @property {number} successfulReferrals - Count of successful referrals made
 * @property {Object} [referredBy] - Information about who referred this user (optional)
 * @property {string} referredBy._id - Referrer's unique ID
 * @property {string} referredBy.name - Referrer's display name
 * @property {string} referredBy.email - Referrer's email address
 * @property {string} referralLink - Complete referral link for sharing
 */
// Define an interface for referral information
export interface ReferralInfo {
  referralCode: string;
  successfulReferrals: number;
  referredBy?: {
    _id: string;
    name: string;
    email: string;
  };
  referralLink: string;
}

/**
 * @interface UserProfile
 * @description Comprehensive user profile data structure containing all user information
 * 
 * @property {string} [_id] - Unique user identifier (optional for updates)
 * @property {string} [username] - User's unique username (optional)
 * @property {string} name - User's display name (required)
 * @property {string} [email] - User's email address (optional for display)
 * @property {string} [displayName] - Alternative display name (optional)
 * @property {string} [photoURL] - Profile picture URL (optional)
 * @property {string} [phoneNumber] - User's phone number (optional)
 * @property {string} [role] - User role in system (optional for display)
 * @property {string} [referralCode] - User's referral code (optional)
 * @property {number} [successfulReferrals] - Count of successful referrals (optional)
 * @property {Object} [referredBy] - Information about referrer (optional)
 * @property {string} referredBy._id - Referrer's unique ID
 * @property {string} referredBy.name - Referrer's display name
 * @property {string} referredBy.email - Referrer's email address
 */
// Define an interface for the user profile data
export interface UserProfile {
  _id?: string;
  username?: string;
  name: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  role?: string;
  referralCode?: string;
  successfulReferrals?: number;
  referredBy?: {
    _id: string;
    name: string;
    email: string;
  };
  // Add any other fields you expect from the backend
}

/**
 * @class UserService
 * @description Service responsible for user profile management, data retrieval, and updates.
 * Provides secure communication with backend user APIs and maintains data consistency
 * across the application for user-related operations.
 * 
 * @implements Injectable
 * 
 * Key Responsibilities:
 * - User profile data retrieval and caching
 * - Profile information updates and validation
 * - Referral information management
 * - Secure API communication with authentication headers
 * - Error handling and data validation
 * 
 * @example
 * ```typescript
 * // Inject service and use for user profile operations
 * constructor(private userService: UserService) {}
 * 
 * // Get current user profile
 * this.userService.getMyProfile().subscribe(
 *   profile => console.log('User profile:', profile),
 *   error => console.error('Failed to load profile:', error)
 * );
 * 
 * // Update user profile
 * const updatedProfile: UserProfile = { name: 'Updated Name' };
 * this.userService.updateMyProfile(updatedProfile).subscribe(
 *   result => console.log('Profile updated successfully'),
 *   error => console.error('Update failed:', error)
 * );
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  /** @property {string} Base URL for user-related API endpoints */
  private apiUrl = '/api/users'; // Adjust if your API base URL is different

  /**
   * @constructor
   * @description Initializes UserService with HTTP client for API communications.
   * 
   * @param {HttpClient} http - Angular HTTP client for making API requests
   */
  constructor(private http: HttpClient) { }
  /**
   * @method getMyProfile
   * @description Retrieves the current authenticated user's complete profile information.
   * Requires valid authentication token in request headers.
   * 
   * @returns {Observable<UserProfile>} Observable containing user profile data
   * 
   * @example
   * ```typescript
   * this.userService.getMyProfile().subscribe({
   *   next: (profile) => {
   *     console.log('User name:', profile.name);
   *     console.log('Email:', profile.email);
   *     console.log('Referral code:', profile.referralCode);
   *     // Update UI with profile information
   *   },
   *   error: (error) => {
   *     console.error('Failed to load profile:', error);
   *     // Handle error (show message, redirect to login)
   *   }
   * });
   * ```
   */
  getMyProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/profile/me`);
  }

  /**
   * @method updateMyProfile
   * @description Updates the current user's profile information with provided data.
   * Validates data server-side and returns updated profile information.
   * 
   * @param {UserProfile} profileData - Profile data to update (partial updates supported)
   * @returns {Observable<UserProfile>} Observable containing updated profile data
   * 
   * @example
   * ```typescript
   * // Update user's name and phone number
   * const updateData: UserProfile = {
   *   name: 'John Doe Updated',
   *   phoneNumber: '+1-555-0123'
   * };
   * 
   * this.userService.updateMyProfile(updateData).subscribe({
   *   next: (updatedProfile) => {
   *     console.log('Profile updated successfully:', updatedProfile);
   *     // Update UI with new profile data
   *   },
   *   error: (error) => {
   *     console.error('Update failed:', error.message);
   *     // Handle validation errors, network issues
   *   }
   * });
   * ```
   */
  updateMyProfile(profileData: UserProfile): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/profile/me`, profileData);
  }

  /**
   * @method getReferralInfo
   * @description Retrieves comprehensive referral information for the current user including
   * referral code, successful referrals count, and referrer information.
   * 
   * @returns {Observable<ReferralInfo>} Observable containing complete referral data
   * 
   * @example
   * ```typescript
   * this.userService.getReferralInfo().subscribe({
   *   next: (referralInfo) => {
   *     console.log('My referral code:', referralInfo.referralCode);
   *     console.log('Successful referrals:', referralInfo.successfulReferrals);
   *     console.log('Referral link:', referralInfo.referralLink);
   *     
   *     if (referralInfo.referredBy) {
   *       console.log('Referred by:', referralInfo.referredBy.name);
   *     }
   *     
   *     // Update referral dashboard UI
   *   },
   *   error: (error) => {
   *     console.error('Failed to load referral info:', error);
   *     // Handle error state in referral section
   *   }
   * });
   * ```
   */
  getReferralInfo(): Observable<ReferralInfo> {
    return this.http.get<ReferralInfo>('/api/auth/referral-info');
  }
}
