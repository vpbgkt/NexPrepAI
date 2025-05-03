import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { ExamShiftService } from '../../../services/exam-shift.service';
import { ExamPaperService, ExamPaper } from '../../../services/exam-paper.service';

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
    private router: Router
  ) {}

  ngOnInit() {
    // 1️⃣ Build the form
    this.form = this.fb.group({
      paper: ['', Validators.required],
      code:  ['', Validators.required],
      name:  ['', Validators.required]
    });

    // 2️⃣ Load Papers for dropdown
    this.paperSvc.getAll().subscribe(list => this.papers = list);
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.shiftSvc.create(this.form.value).subscribe({
      next: shift => {
        window.alert(`✅ Shift "${shift.name}" added.`);
        this.router.navigate(['/exam-shifts']);
      },
      error: err => {
        const msg = err.error?.message || err.message || 'Unknown error';
        window.alert(`❌ Failed to add shift: ${msg}`);
      }
    });
  }
}
