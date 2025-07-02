import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { ExamShiftService } from '../../../services/exam-shift.service';
import { ExamPaperService, ExamPaper } from '../../../services/exam-paper.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  standalone: true,
  selector: 'app-add-exam-shift',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-exam-shift.component.html',
  styleUrls: ['./add-exam-shift.component.scss']
})
export class AddExamShiftComponent implements OnInit {
  form!: FormGroup;
  papers: ExamPaper[] = [];

  constructor(
    private fb: FormBuilder,
    private shiftSvc: ExamShiftService,
    private paperSvc: ExamPaperService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {    // 1️⃣ Build the form
    this.form = this.fb.group({
      paper: ['', Validators.required],
      code: ['', Validators.required],
      name: ['', Validators.required],
      description: ['', Validators.required] // Make description required
    });

    // 2️⃣ Load Papers for dropdown
    this.paperSvc.getAll().subscribe(list => this.papers = list);
  }
  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notificationService.showError('Form Validation Failed', 'Please fill in all required fields correctly.');
      return;
    }

    this.shiftSvc.create(this.form.value).subscribe({
      next: shift => {
        this.notificationService.showSuccess(`Shift "${shift.name}" added.`);
        this.router.navigate(['/exam-shifts']);
      },
      error: err => {
        console.error('Failed to create exam shift:', err);
        let errorMessage = 'Failed to add shift';
        
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.error?.error) {
          errorMessage = err.error.error;
        } else if (err.message) {
          errorMessage = err.message;
        } else if (err.status === 400) {
          errorMessage = 'Invalid data provided. Please check all fields and try again.';
        } else if (err.status === 409) {
          errorMessage = 'Shift with this name or code already exists for this paper.';
        } else if (err.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        this.notificationService.showError('Creation Failed', errorMessage);
      }
    });
  }

  onCancel() {
    this.router.navigate(['/exam-shifts']);
  }
}
