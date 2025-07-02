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
import { NotificationService } from '../../services/notification.service';
import { Router, RouterLink, ActivatedRoute } from '@angular/router'; // Import ActivatedRoute
import { FirebaseAuthService } from '../../services/firebase-auth.service'; // Import FirebaseAuthService

@Component({
    selector: 'app-login',
    imports: [CommonModule, ReactiveFormsModule, RouterLink], // Add RouterLink to imports
    templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  form!: FormGroup;  // will init in ngOnInit
  constructor(
    private fb: FormBuilder,
    private authService: AuthService, // Renamed to authService for clarity
    private router: Router,
    private route: ActivatedRoute, // Add ActivatedRoute
    public firebaseAuthService: FirebaseAuthService, // Make FirebaseAuthService public
    private notificationService: NotificationService
  ) {}
  ngOnInit() {
    // Check if user is already logged in and redirect immediately
    if (this.authService.isLoggedIn()) {
      console.log('User already logged in, redirecting to home');
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
      this.router.navigate([returnUrl]);
      return;
    }

    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });    

    // Subscribe to Firebase auth state changes to handle navigation and app token
    this.firebaseAuthService.currentUser$.subscribe(user => {
      if (user && localStorage.getItem('token') && this.router.url === '/login') { 
        // Only redirect if we're on the login page
        // This prevents unwanted redirects when refreshing other pages like /tests
        // Redirect to home page if user is already authenticated
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
        this.router.navigate([returnUrl]);
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    const { email, password } = this.form.value;
    this.authService.login(email!, password!).subscribe({      
      next: (res) => {
        this.notificationService.showSuccess(
          'Login Successful!',
          'Welcome back! You have been successfully logged in.'
        );
        // AuthService's login method already stores token and role.
        // Check for return URL or redirect to appropriate page
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
        this.router.navigate([returnUrl]);
      },
      error: err => {
        const msg = err.error?.message || 'Login failed';
        this.notificationService.showError(
          'Login Failed',
          msg
        );
      }
    });
  }
  async signInWithGoogle() {
    try {
      await this.firebaseAuthService.googleSignIn();
      // onAuthStateChanged in FirebaseAuthService will handle backend token exchange and navigation
      this.notificationService.showInfo(
        'Google Sign-In',
        'Google Sign-In initiated. Please wait...'
      );
    } catch (error: any) {
      console.error('Google sign-in error in component', error);
      this.notificationService.showError(
        'Google Sign-In Failed',
        error.message || 'Google Sign-In failed. Please try again.'
      );
    }
  }
}
