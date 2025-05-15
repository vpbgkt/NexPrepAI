// Firebase Phone Auth Debugging Helper
// Add this script in your component for additional debugging during Phone OTP testing

// 1. Add these imports to login.component.ts:
/*
import { Injectable } from '@angular/core';
import { ConfirmationResult } from 'firebase/auth';
*/

// 2. Add these debugging properties and methods to your LoginComponent class:

/* 
  // Debugging helpers for Phone OTP
  debugLastPhoneNumber: string = '';
  debugLastOTP: string = '';
  debugMode: boolean = false; // Set to true to enable debug UI
  
  toggleDebugMode(): void {
    this.debugMode = !this.debugMode;
    console.log(`Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
  }
  
  debugSendOTP(): void {
    if (!this.debugLastPhoneNumber) {
      alert('Please enter a phone number in debug panel');
      return;
    }
    this.phoneForm.get('phoneNumber')!.setValue(this.debugLastPhoneNumber);
    this.sendOtp();
  }
  
  debugVerifyOTP(): void {
    if (!this.debugLastOTP) {
      alert('Please enter an OTP in debug panel');
      return;
    }
    this.phoneForm.get('otp')!.setValue(this.debugLastOTP);
    this.verifyOtp();
  }
  
  debugFirebaseAuthStatus(): void {
    const user = this.firebaseAuthService.getCurrentUser();
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    console.log('Current Firebase User:', user);
    console.log('App Token Present:', !!token);
    console.log('User Role:', role || 'None');
    
    alert(`Firebase Auth Status:
    - User logged in: ${!!user}
    - App token present: ${!!token}
    - Role: ${role || 'None'}`);
  }
  
  debugResetCaptcha(): void {
    this.firebaseAuthService.setupRecaptcha('recaptcha-container')
      .then(() => alert('reCAPTCHA reset successfully'))
      .catch(err => alert('reCAPTCHA reset failed: ' + err.message));
  }
*/

// 3. Add this HTML anywhere in your login.component.html to show debugging UI:

/*
<div class="debugging-tools" *ngIf="debugMode" style="margin-top: 30px; padding: 10px; border: 1px dashed red;">
  <h3>Debugging Tools</h3>
  <div style="margin-bottom: 10px;">
    <label>Phone Number:</label>
    <input type="text" [(ngModel)]="debugLastPhoneNumber" placeholder="+16505551234">
    <button (click)="debugSendOTP()">Debug Send OTP</button>
  </div>
  <div style="margin-bottom: 10px;">
    <label>OTP Code:</label>
    <input type="text" [(ngModel)]="debugLastOTP" placeholder="123456">
    <button (click)="debugVerifyOTP()">Debug Verify OTP</button>
  </div>
  <div>
    <button (click)="debugFirebaseAuthStatus()">Check Auth Status</button>
    <button (click)="debugResetCaptcha()">Reset reCAPTCHA</button>
  </div>
</div>

<button (click)="toggleDebugMode()" style="position: fixed; bottom: 10px; right: 10px; opacity: 0.3;">Debug</button>
*/
