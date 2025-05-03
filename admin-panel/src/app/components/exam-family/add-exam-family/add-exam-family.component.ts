import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ExamFamilyService } from '../../../services/exam-family.service';

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
    private router: Router
  ) {}

  ngOnInit() {
    // Initialize form *after* fb is set
    this.form = this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],       // ← make code required
      description: ['']
    });
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.svc.create(this.form.value).subscribe({
      next: family => {
        // Show success alert
        window.alert(`✅ Exam Family "${family.name}" added successfully.`);
        this.router.navigate(['/exam-families']);
      },
      error: err => {
        // Show error alert
        const msg = err.error?.message || err.message || 'Unknown error';
        window.alert(`❌ Failed to add Exam Family: ${msg}`);
      }
    });
  }
}
