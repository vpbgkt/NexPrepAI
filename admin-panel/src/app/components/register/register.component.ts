import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit {
  form!: FormGroup;  // tell TS we’ll initialize in ngOnInit

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    // now fb is definitely injected
    this.form = this.fb.group({
      username: ['', Validators.required],
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.form.invalid) return;

    const { username, email, password } = this.form.value as {
      username: string;
      email:    string;
      password: string;
    };

    this.auth.register({ username, email, password }).subscribe({
      next: () => {
        this.notificationService.showSuccess(
          'Registration Successful!',
          'Your administrator account has been created. You can now log in.'
        );
        this.router.navigate(['/login']);
      },
      error: err => {
        const msg = err.error?.message || 'Registration failed';
        this.notificationService.showError(
          'Registration Failed',
          msg
        );
      }
    });
  }
}
