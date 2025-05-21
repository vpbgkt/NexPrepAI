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
    public firebaseAuthService: FirebaseAuthService // Inject FirebaseAuthService
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      name: ['', Validators.required], // Added name field
      username: ['', Validators.required],
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      // Mark all fields as touched to display validation messages
      this.form.markAllAsTouched();
      return;
    }
    // Make sure to get the name value from the form
    const { name, username, email, password } = this.form.value;
    // Update the register call to include the name
    this.auth.register(name!, username!, email!, password!).subscribe({
      next: () => {
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
      await this.firebaseAuthService.googleSignIn();
      // onAuthStateChanged in FirebaseAuthService will handle backend token exchange and navigation
      // It will also create a new user in the backend if one doesn't exist.
    } catch (error: any) {
      console.error('Google sign-in error in component', error);
      alert(error.message || 'Google Sign-In failed.');
    }
  }
}
