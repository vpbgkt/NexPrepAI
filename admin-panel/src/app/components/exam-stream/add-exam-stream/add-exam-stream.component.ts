import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ExamStreamService } from '../../../services/exam-stream.service';
import { ExamFamilyService, ExamFamily } from '../../../services/exam-family.service';

@Component({
  standalone: true,
  selector: 'app-add-exam-stream',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-exam-stream.component.html',
  styleUrls: ['./add-exam-stream.component.scss']
})
export class AddExamStreamComponent implements OnInit {
  form!: FormGroup;
  families: ExamFamily[] = [];

  constructor(
    private fb: FormBuilder,
    private svc: ExamStreamService,
    private familySvc: ExamFamilyService,
    private router: Router
  ) {}

  ngOnInit() {
    // 1. Build the form
    this.form = this.fb.group({
      family: ['', Validators.required],
      code:   ['', Validators.required],
      name:   ['', Validators.required]
    });

    // 2. Load families for the dropdown
    this.familySvc.getAll().subscribe(data => this.families = data);
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.svc.create(this.form.value).subscribe({
      next: stream => {
        window.alert(`✅ Stream "${stream.name}" added.`);
        this.router.navigate(['/exam-streams']);
      },
      error: err => {
        const msg = err.error?.message || err.message || 'Unknown error';
        window.alert(`❌ Failed to add stream: ${msg}`);
      }
    });
  }
}
