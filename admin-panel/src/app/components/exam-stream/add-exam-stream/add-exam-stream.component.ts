import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ExamStreamService } from '../../../services/exam-stream.service';
import { ExamFamilyService, ExamFamily } from '../../../services/exam-family.service';
import { ExamLevelService, ExamLevel } from '../../../services/exam-level.service';
import { ExamBranchService, ExamBranch } from '../../../services/exam-branch.service';
import { NotificationService } from '../../../services/notification.service';

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
  levels: ExamLevel[] = [];
  branches: ExamBranch[] = [];

  constructor(
    private fb: FormBuilder,
    private svc: ExamStreamService,
    private familySvc: ExamFamilyService,
    private levelSvc: ExamLevelService,
    private branchSvc: ExamBranchService,
    private router: Router,
    private notificationService: NotificationService
  ) {}  ngOnInit() {
    // 1. Build the form
    this.form = this.fb.group({
      family: ['', Validators.required],
      level: ['', Validators.required],
      branch: ['', Validators.required],
      code: [''], // Made optional - will auto-generate if empty
      name: ['', Validators.required],
      conductingAuthority: [''],
      region: [''],
      language: ['English'], // Default to English
      status: ['Active'], // Default to Active
      description: ['', Validators.required] // Make description required
    });

    // 2. Load families for the dropdown
    this.familySvc.getAll().subscribe(data => this.families = data);

    // 3. When family changes, load levels for that family
    this.form.get('family')?.valueChanges.subscribe(familyId => {
      this.levels = [];
      this.branches = [];
      this.form.get('level')?.reset('');
      this.form.get('branch')?.reset('');
      if (familyId) {
        this.levelSvc.getByFamily(familyId).subscribe(levels => this.levels = levels);
      }
    });

    // 4. When level changes, load branches for that level
    this.form.get('level')?.valueChanges.subscribe(levelId => {
      this.branches = [];
      this.form.get('branch')?.reset('');
      if (levelId) {
        this.branchSvc.getByLevel(levelId).subscribe(branches => this.branches = branches);
      }
    });

    // 4. Auto-generate code from name if code is empty
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notificationService.showError('Form Validation Failed', 'Please fill in all required fields correctly.');
      return;
    }

    this.svc.create(this.form.value).subscribe({
      next: stream => {
        this.notificationService.showSuccess(`Stream "${stream.name}" added.`);
        this.router.navigate(['/exam-streams']);
      },
      error: err => {
        console.error('Failed to create exam stream:', err);
        let errorMessage = 'Failed to add stream';
        
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.error?.error) {
          errorMessage = err.error.error;
        } else if (err.message) {
          errorMessage = err.message;
        } else if (err.status === 400) {
          errorMessage = 'Invalid data provided. Please check all fields and try again.';
        } else if (err.status === 409) {
          errorMessage = 'Stream with this name or code already exists for this branch.';
        } else if (err.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        this.notificationService.showError('Creation Failed', errorMessage);
      }
    });
  }
}
