import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ExamFamilyService } from '../../../services/exam-family.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  standalone: true,
  selector: 'app-add-exam-family',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-exam-family.component.html',
  styleUrls: ['./add-exam-family.component.scss']
})
export class AddExamFamilyComponent implements OnInit {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private svc: ExamFamilyService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    // Initialize form *after* fb is set
    this.form = this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],       // ← make code required
      description: ['', Validators.required] // Make description required
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notificationService.showError('Form Validation Failed', 'Please fill in all required fields correctly.');
      return;
    }

    this.svc.create(this.form.value).subscribe({
      next: family => {
        // Show success alert
        this.notificationService.showSuccess(`Exam Family "${family.name}" added successfully.`);
        this.router.navigate(['/exam-families']);
      },
      error: err => {
        // Show detailed error alert
        console.error('Failed to create exam family:', err);
        let errorMessage = 'Failed to add Exam Family';
        
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.error?.error) {
          errorMessage = err.error.error;
        } else if (err.message) {
          errorMessage = err.message;
        } else if (err.status === 400) {
          errorMessage = 'Invalid data provided. Please check all fields.';
        } else if (err.status === 409) {
          errorMessage = 'Exam Family with this name or code already exists.';
        } else if (err.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        this.notificationService.showError('Creation Failed', errorMessage);
      }
    });
  }
}
