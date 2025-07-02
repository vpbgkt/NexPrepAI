import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { ExamLevelService } from '../../../services/exam-level.service';
import { ExamFamilyService, ExamFamily } from '../../../services/exam-family.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  standalone: true,
  selector: 'app-add-exam-level',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-exam-level.component.html',
  styleUrls: ['./add-exam-level.component.scss']
})
export class AddExamLevelComponent implements OnInit {
  form!: FormGroup;
  families: ExamFamily[] = [];

  constructor(
    private fb: FormBuilder,
    private levelSvc: ExamLevelService,
    private familySvc: ExamFamilyService,
    private router: Router,
    private notificationSvc: NotificationService
  ) {}

  ngOnInit() {
    // Build the form
    this.form = this.fb.group({
      familyId: ['', Validators.required],
      code: ['', Validators.required],
      name: ['', Validators.required],
      description: ['', Validators.required] // Make description required
    });

    // Load families for the dropdown
    this.familySvc.getAll().subscribe(data => this.families = data);
  }
  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notificationSvc.showError('Form Validation Failed', 'Please fill in all required fields correctly.');
      return;
    }

    // Map familyId to family for backend compatibility
    const formData = {
      ...this.form.value,
      family: this.form.value.familyId
    };
    delete formData.familyId;

    this.levelSvc.create(formData).subscribe({
      next: level => {
        this.notificationSvc.showSuccess(`Exam Level "${level.name}" added successfully.`);
        this.router.navigate(['/exam-levels']);
      },
      error: err => {
        console.error('Failed to create exam level:', err);
        let errorMessage = 'Failed to add exam level';
        
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.error?.error) {
          errorMessage = err.error.error;
        } else if (err.message) {
          errorMessage = err.message;
        } else if (err.status === 400) {
          errorMessage = 'Invalid data provided. Please check all fields and try again.';
        } else if (err.status === 409) {
          errorMessage = 'Exam Level with this name or code already exists in this family.';
        } else if (err.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        this.notificationSvc.showError('Creation Failed', errorMessage);
      }
    });
  }
}
