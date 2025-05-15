declare var grecaptcha: any; // Declare grecaptcha for reCAPTCHA reset
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
  FormControl // Import FormControl
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FirebaseAuthService } from '../../services/firebase-auth.service'; // Import FirebaseAuthService
import firebase from 'firebase/compat/app'; // Import firebase for ConfirmationResult type

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit {
  form!: FormGroup;  // will init in ngOnInit
  phoneForm!: FormGroup; // Form for phone number and OTP
  isOtpSent = false;
  // confirmationResult is now managed within FirebaseAuthService
  // recaptchaVerifier is also managed within FirebaseAuthService after setup

  constructor(
    private fb: FormBuilder,
    private authService: AuthService, // Renamed to authService for clarity
    private router: Router,
    public firebaseAuthService: FirebaseAuthService // Make FirebaseAuthService public
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.phoneForm = this.fb.group({
      phoneNumber: ['', [Validators.required, Validators.pattern('^\\+?[1-9]\\d{1,14}$')]], // E.164 format
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });

    // Subscribe to Firebase auth state changes to handle navigation and app token
    this.firebaseAuthService.currentUser$.subscribe(user => {
      if (user && localStorage.getItem('token')) { // Check if app token is also set
        // This implies that onAuthStateChanged in service has completed backend exchange
        // and the app token is stored by AuthService's handleFirebaseLogin or traditional login.
        // Navigate based on role if needed, or to a default dashboard.
        const role = this.authService.getRole();
        if (role === 'admin') {
            this.router.navigate(['/admin/dashboard']);
        } else {
            this.router.navigate(['/student/dashboard']);
        }
      }
    });
  }

  ngAfterViewInit() { // Use ngAfterViewInit to ensure the container element is in the DOM
    // Initialize reCAPTCHA verifier through the service
    // The service will create and manage the RecaptchaVerifier instance.
    this.firebaseAuthService.setupRecaptcha('recaptcha-container');
  }

  onSubmit() {
    if (this.form.invalid) return;
    const { email, password } = this.form.value;
    this.authService.login(email!, password!).subscribe({
      next: (res) => {
        alert('Login successful!');
        // AuthService's login method already stores token and role.
        // Navigation can be centralized or handled here based on role.
        if (res.role === 'admin') {
            this.router.navigate(['/admin/dashboard']);
        } else {
            this.router.navigate(['/student/dashboard']);
        }
      },
      error: err => {
        const msg = err.error?.message || 'Login failed';
        alert(msg);
      }
    });
  }

  async signInWithGoogle() {
    try {
      await this.firebaseAuthService.googleSignIn();
      // onAuthStateChanged in FirebaseAuthService will handle backend token exchange and navigation
      // alert('Google Sign-In initiated. Please wait...'); // Optional user feedback
    } catch (error: any) {
      console.error('Google sign-in error in component', error);
      alert(error.message || 'Google Sign-In failed.');
    }
  }

  async sendOtp() {
    if (this.phoneForm.get('phoneNumber')!.invalid) {
      alert('Please enter a valid phone number.');
      return;
    }
    const phoneNumber = this.phoneForm.get('phoneNumber')!.value;
    try {
      await this.firebaseAuthService.signInWithPhoneNumber(phoneNumber);
      this.isOtpSent = true;
      alert('OTP sent to your phone!');
    } catch (error: any) {
      console.error('Error sending OTP in component', error);
      // Reset reCAPTCHA through the service if necessary, or re-render it.
      // The service method `signInWithPhoneNumber` should handle clearing/resetting reCAPTCHA on failure.
      // Forcing a re-render or re-setup if the service doesn't handle it fully:
      if (this.firebaseAuthService.recaptchaVerifier) {
        this.firebaseAuthService.recaptchaVerifier.render().then((widgetId) => {
            if (typeof grecaptcha !== 'undefined' && grecaptcha.reset) {
                grecaptcha.reset(widgetId);
            }
        }).catch(renderError => console.error('Error re-rendering reCAPTCHA', renderError));
      } else {
        // If verifier is null, re-initialize it.
        this.firebaseAuthService.setupRecaptcha('recaptcha-container');
      }
      alert(error.message || 'Failed to send OTP. Please try again.');
    }
  }

  async verifyOtp() {
    if (this.phoneForm.get('otp')!.invalid) {
      alert('Please enter the 6-digit OTP.');
      return;
    }
    const otp = this.phoneForm.get('otp')!.value;
    try {
      await this.firebaseAuthService.verifyOtp(otp);
      // onAuthStateChanged in FirebaseAuthService will handle backend token exchange and navigation
      // alert('OTP Verification successful. Please wait...'); // Optional user feedback
    } catch (error: any) {
      console.error('Error verifying OTP in component', error);
      alert(error.message || 'Failed to verify OTP.');
      this.isOtpSent = false; 
      this.phoneForm.get('otp')!.reset();
    }
  }
}
