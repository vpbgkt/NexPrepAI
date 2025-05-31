import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  form!: FormGroup; // Initialize in ngOnInit

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Initialize the form FIRST
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    // THEN check if logged in and redirect if necessary
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/home']);
      // No return needed here, or if used, ensure it doesn't skip critical initializations 
      // that the template might depend on before the component is destroyed.
      // For this specific case, allowing the form to be initialized is harmless 
      // as the component will be navigated away from shortly.
    }
  }
  onSubmit() {
    if (this.form.invalid) return;
    const { email, password } = this.form.value as { email: string; password: string };
    this.auth.login(email, password).subscribe({
      next: (res: any) => {
        // Check if the user has admin or superadmin role
        if (res.role !== 'admin' && res.role !== 'superadmin') {
          // If not admin or superadmin, log them out and show error
          this.auth.logout();
          alert('Access denied: Only administrators or super administrators can access this panel. Please login with appropriate credentials.');
          return;
        }
        
        // If admin or superadmin, proceed with login
        this.router.navigate(['/home']);
      },
      error: err => {
        // err.error.message comes from your backend
        const msg = err.error?.message || 'Login failed. Please check your credentials and try again.';
        alert(msg);
      }
    });
  }
}