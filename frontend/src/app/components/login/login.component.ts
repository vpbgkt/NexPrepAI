import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
  FormControl // Import FormControl
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router'; // Import RouterLink
import { FirebaseAuthService } from '../../services/firebase-auth.service'; // Import FirebaseAuthService

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink], // Add RouterLink to imports
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  form!: FormGroup;  // will init in ngOnInit
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
}
