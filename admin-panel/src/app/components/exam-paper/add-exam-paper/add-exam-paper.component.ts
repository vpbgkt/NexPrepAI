import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { ExamPaperService } from '../../../services/exam-paper.service';
import {
  ExamFamilyService, ExamFamily
} from '../../../services/exam-family.service';
import {
  ExamStreamService, ExamStream
} from '../../../services/exam-stream.service';

@Component({
  standalone: true,
  selector: 'app-add-exam-paper',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-exam-paper.component.html',
  styleUrls: ['./add-exam-paper.component.scss']
})
export class AddExamPaperComponent implements OnInit {
  form!: FormGroup;
  families: ExamFamily[] = [];
  streams: ExamStream[] = [];

  constructor(
    private fb: FormBuilder,
    private paperSvc: ExamPaperService,
    private familySvc: ExamFamilyService,
    private streamSvc: ExamStreamService,
    private router: Router
  ) {}

  ngOnInit() {
    // Build form
    this.form = this.fb.group({
      family: ['', Validators.required],
      stream: ['', Validators.required],
      code:   ['', Validators.required],
      name:   ['', Validators.required],
      description: ['']
    });

    // Load families
    this.familySvc.getAll().subscribe(f => this.families = f);

    // When family changes, load streams
    this.form.get('family')?.valueChanges.subscribe(familyId => {
      this.streams = [];
      this.form.get('stream')?.reset('');
      this.streamSvc.getByFamily(familyId)
        .subscribe(s => this.streams = s);
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.paperSvc.create(this.form.value).subscribe({
      next: paper => {
        window.alert(`✅ Paper "${paper.name}" added.`);
        this.router.navigate(['/exam-papers']);
      },
      error: err => {
        const msg = err.error?.message || err.message || 'Unknown';
        window.alert(`❌ Failed to add paper: ${msg}`);
      }
    });
  }
}
