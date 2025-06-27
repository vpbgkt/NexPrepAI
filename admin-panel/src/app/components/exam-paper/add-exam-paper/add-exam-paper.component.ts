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
  ExamLevelService, ExamLevel
} from '../../../services/exam-level.service';
import {
  ExamBranchService, ExamBranch
} from '../../../services/exam-branch.service';
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
  levels: ExamLevel[] = [];
  branches: ExamBranch[] = [];
  streams: ExamStream[] = [];
  allLevels: ExamLevel[] = [];
  allBranches: ExamBranch[] = [];
  allStreams: ExamStream[] = [];

  constructor(
    private fb: FormBuilder,
    private paperSvc: ExamPaperService,
    private familySvc: ExamFamilyService,
    private levelSvc: ExamLevelService,
    private branchSvc: ExamBranchService,
    private streamSvc: ExamStreamService,
    private router: Router
  ) {}
  ngOnInit() {
    // Build form with complete hierarchy
    this.form = this.fb.group({
      family: ['', Validators.required],
      level: ['', Validators.required],
      branch: ['', Validators.required],
      stream: ['', Validators.required],
      code: [''], // Made optional - will auto-generate if empty
      name: ['', Validators.required],
      year: [''],
      durationMinutes: [''],
      passingCriteria: [''],
      examDate: [''],
      description: ['']
    });

    // Load initial data
    this.loadFamilies();
    this.loadAllLevels();
    this.loadAllBranches();
    this.loadAllStreams();

    // Set up hierarchical filtering
    this.setupHierarchicalFiltering();

    // Auto-generate code from name if code is empty
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

  loadAllLevels() {
    this.levelSvc.getAll().subscribe({
      next: (data) => this.allLevels = data,
      error: (err) => console.error('Error loading levels:', err)
    });
  }

  loadAllBranches() {
    this.branchSvc.getAll().subscribe({
      next: (data) => this.allBranches = data,
      error: (err) => console.error('Error loading branches:', err)
    });
  }

  loadAllStreams() {
    this.streamSvc.getAll().subscribe({
      next: (data) => this.allStreams = data,
      error: (err) => console.error('Error loading streams:', err)
    });
  }

  setupHierarchicalFiltering() {
    // When family changes, filter levels
    this.form.get('family')?.valueChanges.subscribe(familyId => {
      this.filterLevelsByFamily(familyId);
      this.resetDownstreamSelections(['level', 'branch', 'stream']);
    });

    // When level changes, filter branches
    this.form.get('level')?.valueChanges.subscribe(levelId => {
      this.filterBranchesByLevel(levelId);
      this.resetDownstreamSelections(['branch', 'stream']);
    });

    // When branch changes, filter streams
    this.form.get('branch')?.valueChanges.subscribe(branchId => {
      this.filterStreamsByFamilyLevelBranch();
      this.resetDownstreamSelections(['stream']);
    });
  }

  filterLevelsByFamily(familyId: string) {
    if (!familyId) {
      this.levels = [];
      return;
    }
    this.levels = this.allLevels.filter(level => level.family?._id === familyId);
  }

  filterBranchesByLevel(levelId: string) {
    if (!levelId) {
      this.branches = [];
      return;
    }
    
    // Filter branches that belong to the selected level
    // Note: ExamBranch model has a single 'level' reference, not an array
    this.branches = this.allBranches.filter(branch => {
      const branchLevelId = typeof branch.level === 'string' ? branch.level : branch.level?._id;
      return branchLevelId === levelId;
    });
  }

  filterStreamsByFamilyLevelBranch() {
    const familyId = this.form.get('family')?.value;
    const levelId = this.form.get('level')?.value;
    const branchId = this.form.get('branch')?.value;

    if (!familyId || !levelId || !branchId) {
      this.streams = [];
      return;
    }

    // Filter streams that match family, level, and branch
    this.streams = this.allStreams.filter(stream => {
      const streamFamilyId = typeof stream.family === 'string' ? stream.family : stream.family?._id;
      const streamLevelId = typeof stream.level === 'string' ? stream.level : stream.level?._id;
      const streamBranchId = typeof stream.branch === 'string' ? stream.branch : stream.branch?._id;
      
      return streamFamilyId === familyId &&
             streamLevelId === levelId &&
             streamBranchId === branchId;
    });
  }

  resetDownstreamSelections(fields: string[]) {
    fields.forEach(field => {
      this.form.get(field)?.setValue('');
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
    
    const formValue = this.form.value;
    
    // Prepare the data with the correct structure for ExamPaper model
    const paperData = {
      family: formValue.family,
      stream: formValue.stream,
      code: formValue.code || this.generateCodeFromName(formValue.name), // Ensure code is provided
      name: formValue.name,
      year: formValue.year ? parseInt(formValue.year) : undefined,
      durationMinutes: formValue.durationMinutes ? parseInt(formValue.durationMinutes) : undefined,
      passingCriteria: formValue.passingCriteria,
      examDate: formValue.examDate ? new Date(formValue.examDate) : undefined,
      description: formValue.description
    };

    this.paperSvc.create(paperData).subscribe({
      next: paper => {
        window.alert(`✅ Paper "${paper.name}" added successfully!`);
        this.router.navigate(['/exam-papers']);
      },
      error: err => {
        const msg = err.error?.message || err.message || 'Unknown error';
        window.alert(`❌ Failed to add paper: ${msg}`);
      }
    });
  }
}
