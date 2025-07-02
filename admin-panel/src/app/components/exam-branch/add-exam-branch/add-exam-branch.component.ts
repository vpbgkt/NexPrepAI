import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ExamBranchService } from '../../../services/exam-branch.service';
import { ExamLevelService, ExamLevel } from '../../../services/exam-level.service';
import { ExamFamilyService, ExamFamily } from '../../../services/exam-family.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  standalone: true,
  selector: 'app-add-exam-branch',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-exam-branch.component.html',
  styleUrls: ['./add-exam-branch.component.scss']
})
export class AddExamBranchComponent implements OnInit {
  form!: FormGroup;
  families: ExamFamily[] = [];
  levels: ExamLevel[] = [];
  allLevels: ExamLevel[] = []; // Store all levels for filtering

  constructor(
    private fb: FormBuilder,
    private svc: ExamBranchService,
    private levelSvc: ExamLevelService,
    private familySvc: ExamFamilyService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    // 1. Build the form with exam family
    this.form = this.fb.group({
      family: ['', Validators.required],
      level: ['', Validators.required],
      code: [''], // Made optional - will auto-generate if empty
      name: ['', Validators.required],
      description: ['', Validators.required] // Make description required
    });

    // 2. Load families and all levels
    this.loadFamilies();
    this.loadLevels();

    // 3. Watch for family changes to filter levels
    this.form.get('family')?.valueChanges.subscribe(familyId => {
      this.filterLevelsByFamily(familyId);
      // Reset level selection when family changes
      this.form.get('level')?.setValue('');
    });

    // 4. Auto-generate code from name if code is empty
    this.form.get('name')?.valueChanges.subscribe(name => {
      const codeControl = this.form.get('code');
      if (name && (!codeControl?.value || codeControl?.value.trim() === '')) {
        const autoCode = this.generateCodeFromName(name);
        codeControl?.setValue(autoCode);
      }
    });
  }

  loadFamilies() {
    this.familySvc.getAll().subscribe({
      next: (data) => this.families = data,
      error: (err) => console.error('Error loading families:', err)
    });
  }

  loadLevels() {
    this.levelSvc.getAll().subscribe({
      next: (data) => {
        this.allLevels = data;
        this.levels = []; // Start with empty levels until family is selected
      },
      error: (err) => console.error('Error loading levels:', err)
    });
  }

  filterLevelsByFamily(familyId: string) {
    if (!familyId) {
      this.levels = [];
      return;
    }
    
    // Filter levels that belong to the selected family
    this.levels = this.allLevels.filter(level => 
      level.family?._id === familyId
    );
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notificationService.showError('Form Validation Failed', 'Please fill in all required fields correctly.');
      return;
    }

    const formValue = this.form.value;
    
    // Prepare the data with the correct structure for ExamBranch model
    const branchData = {
      level: formValue.level, // Single level reference for ExamBranch model
      code: formValue.code || this.generateCodeFromName(formValue.name), // Ensure code is provided
      name: formValue.name,
      description: formValue.description
    };

    this.svc.create(branchData).subscribe({
      next: branch => {
        this.notificationService.showSuccess(`Branch "${branch.name}" added successfully!`);
        this.router.navigate(['/exam-branches']);
      },
      error: err => {
        console.error('Failed to create exam branch:', err);
        let errorMessage = 'Failed to add branch';
        
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.error?.error) {
          errorMessage = err.error.error;
        } else if (err.message) {
          errorMessage = err.message;
        } else if (err.status === 400) {
          errorMessage = 'Invalid data provided. Please check all fields and try again.';
        } else if (err.status === 409) {
          errorMessage = 'Branch with this name or code already exists in this level.';
        } else if (err.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        this.notificationService.showError('Creation Failed', errorMessage);
      }
    });
  }
}
