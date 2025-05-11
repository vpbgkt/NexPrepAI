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
      next: (res: any) => { // Assuming res might contain user info
        alert('Login successful!');
        // AuthService should handle storing token and user info (like name)
        // For example, if res.user.name contains the user's name:
        // if (res.user && res.user.name) {
        //   localStorage.setItem('userName', res.user.name); 
        // }
        this.router.navigate(['/home']); // Redirect to home page
      },
      error: err => {
        // err.error.message comes from your backend
        const msg = err.error?.message || 'Login failed';
        alert(msg);
      }
    });
  }
}