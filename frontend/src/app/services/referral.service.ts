import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReferralService {
  private readonly STORAGE_KEY = 'pendingReferralCode';
  private referralCodeFromUrl = new BehaviorSubject<string | null>(null);

  referralCodeFromUrl$ = this.referralCodeFromUrl.asObservable();

  constructor() {
    // Initialize with any existing code from sessionStorage
    const existingCode = this.getStoredReferralCode();
    if (existingCode) {
      this.referralCodeFromUrl.next(existingCode);
    }
  }

  /**
   * Set the referral code from URL or other source
   */
  setReferralCode(code: string): void {
    if (code && code.trim()) {
      const normalizedCode = code.trim().toUpperCase();
      this.referralCodeFromUrl.next(normalizedCode);
      sessionStorage.setItem(this.STORAGE_KEY, normalizedCode);
      console.log('Referral code captured:', normalizedCode);
    }
  }

  /**
   * Get the current referral code
   */
  getReferralCode(): string | null {
    return this.referralCodeFromUrl.getValue() || this.getStoredReferralCode();
  }

  /**
   * Clear the stored referral code
   */
  clearReferralCode(): void {
    this.referralCodeFromUrl.next(null);
    sessionStorage.removeItem(this.STORAGE_KEY);
    console.log('Referral code cleared');
  }

  /**
   * Get referral code from sessionStorage
   */
  private getStoredReferralCode(): string | null {
    return sessionStorage.getItem(this.STORAGE_KEY);
  }

  /**
   * Check if there's a pending referral code
   */
  hasPendingReferralCode(): boolean {
    return !!this.getReferralCode();
  }
}
