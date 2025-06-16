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
      code: [''], // Made optional - will auto-generate if empty
      name: ['', Validators.required],
      year: [''],
      durationMinutes: [''],
      passingCriteria: [''],
      examDate: [''],
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

    // Auto-generate code from name if code is empty
    this.form.get('name')?.valueChanges.subscribe(name => {
      const codeControl = this.form.get('code');
      if (name && (!codeControl?.value || codeControl?.value.trim() === '')) {
        const autoCode = this.generateCodeFromName(name);
        codeControl?.setValue(autoCode);
      }
    });  }

  /**
   * Generate a code from name by converting to lowercase, 
   * replacing spaces with hyphens, and removing special characters
   */
  private generateCodeFromName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
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
