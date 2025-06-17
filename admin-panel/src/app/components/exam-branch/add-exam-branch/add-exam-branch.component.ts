import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ExamBranchService } from '../../../services/exam-branch.service';
import { ExamLevelService, ExamLevel } from '../../../services/exam-level.service';

@Component({
  standalone: true,
  selector: 'app-add-exam-branch',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-exam-branch.component.html',
  styleUrls: ['./add-exam-branch.component.scss']
})
export class AddExamBranchComponent implements OnInit {
  form!: FormGroup;
  levels: ExamLevel[] = [];

  constructor(
    private fb: FormBuilder,
    private svc: ExamBranchService,
    private levelSvc: ExamLevelService,
    private router: Router
  ) {}

  ngOnInit() {
    // 1. Build the form
    this.form = this.fb.group({
      level: ['', Validators.required],
      code: [''], // Made optional - will auto-generate if empty
      name: ['', Validators.required],
      description: ['']
    });

    // 2. Load levels for the dropdown
    this.levelSvc.getAll().subscribe(data => this.levels = data);

    // 3. Auto-generate code from name if code is empty
    this.form.get('name')?.valueChanges.subscribe(name => {
      const codeControl = this.form.get('code');
      if (name && (!codeControl?.value || codeControl?.value.trim() === '')) {
        const autoCode = this.generateCodeFromName(name);
        codeControl?.setValue(autoCode);
      }
    });
  }

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

    this.svc.create(this.form.value).subscribe({
      next: branch => {
        window.alert(`✅ Branch "${branch.name}" added.`);
        this.router.navigate(['/exam-branches']);
      },
      error: err => {
        const msg = err.error?.message || err.message || 'Unknown error';
        window.alert(`❌ Failed to add branch: ${msg}`);
      }
    });
  }
}
