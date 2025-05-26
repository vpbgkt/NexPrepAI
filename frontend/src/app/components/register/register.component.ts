import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router'; // Import RouterLink
import { FirebaseAuthService } from '../../services/firebase-auth.service'; // Import FirebaseAuthService
import { ReferralService } from '../../services/referral.service'; // Import ReferralService

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink], // Add RouterLink to imports
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  form!: FormGroup;
  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    public firebaseAuthService: FirebaseAuthService, // Inject FirebaseAuthService
    private referralService: ReferralService // Inject ReferralService
  ) {}
  ngOnInit() {
    // Get referral code from service if available
    const storedReferralCode = this.referralService.getReferralCode();
    
    this.form = this.fb.group({
      name: ['', Validators.required], // Added name field
      username: ['', Validators.required],
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      referralCode: [storedReferralCode || ''] // Add referral code field with pre-filled value
    });
  }
  onSubmit() {
    if (this.form.invalid) {
      // Mark all fields as touched to display validation messages
      this.form.markAllAsTouched();
      return;
    }
    // Get all form values including referral code
    const { name, username, email, password, referralCode } = this.form.value;
    
    // Update the register call to include the referral code
    this.auth.register(name!, username!, email!, password!, referralCode).subscribe({
      next: () => {
        // Clear referral code from service after successful registration
        this.referralService.clearReferralCode();
        alert('Registration successful! Please log in.');
        this.router.navigate(['/login']);
      },
      error: err => {
        const msg = err.error?.message || 'Registration failed';
        alert(msg);
      }
    });
  }
  async signInWithGoogle() {
    try {
      // Get referral code from form if available
      const referralCode = this.form.get('referralCode')?.value;
      
      await this.firebaseAuthService.googleSignIn(referralCode);
      // onAuthStateChanged in FirebaseAuthService will handle backend token exchange and navigation
      // It will also create a new user in the backend if one doesn't exist.
    } catch (error: any) {
      console.error('Google sign-in error in component', error);
      alert(error.message || 'Google Sign-In failed.');
    }
  }
}
