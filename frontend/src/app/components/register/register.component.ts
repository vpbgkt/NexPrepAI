import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router'; // Import RouterLink
import { FirebaseAuthService } from '../../services/firebase-auth.service'; // Import FirebaseAuthService
import { ReferralService } from '../../services/referral.service'; // Import ReferralService

// Custom email validator
function validEmailValidator(control: AbstractControl): ValidationErrors | null {
  const email = control.value;
  if (!email) return null; // Let required validator handle empty values

  // Basic email format check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { invalidEmailFormat: true };
  }

  // Check for invalid domains/patterns
  const invalidPatterns = [
    /^.+@example\.(com|org|net)$/i,
    /^.+@test\.(com|org|net)$/i,
    /^.+@sample\.(com|org|net)$/i,
    /^.+@dummy\.(com|org|net)$/i,
    /^[a-z]@[a-z]\.(com|org|net)$/i, // Single character before and after @
    /^.+@.+\.(fake|invalid|test)$/i
  ];

  for (const pattern of invalidPatterns) {
    if (pattern.test(email)) {
      return { invalidEmailDomain: true };
    }
  }

  return null;
}

// Custom password validator
function strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.value;
  if (!password) return null; // Let required validator handle empty values

  const errors: ValidationErrors = {};

  // Minimum length check
  if (password.length < 6) {
    errors['minLength'] = true;
  }

  // Must contain at least one letter or number
  if (!/[a-zA-Z0-9]/.test(password)) {
    errors['noAlphanumeric'] = true;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

@Component({
    selector: 'app-register',
    imports: [CommonModule, ReactiveFormsModule, RouterLink], // Add RouterLink to imports
    templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit {
  form!: FormGroup;
  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    public firebaseAuthService: FirebaseAuthService, // Inject FirebaseAuthService
    private referralService: ReferralService // Inject ReferralService
  ) {}  ngOnInit() {
    // Get referral code from service if available
    const storedReferralCode = this.referralService.getReferralCode();
    
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, validEmailValidator]],
      password: ['', [Validators.required, strongPasswordValidator]],
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
