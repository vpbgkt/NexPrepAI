import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ExamLevelService } from '../../../services/exam-level.service';
import { ExamFamilyService, ExamFamily } from '../../../services/exam-family.service';

@Component({
  standalone: true,
  selector: 'app-add-exam-level',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-exam-level.component.html',
  styleUrls: ['./add-exam-level.component.scss']
})
export class AddExamLevelComponent implements OnInit {
  form!: FormGroup;
  families: ExamFamily[] = [];

  constructor(
    private fb: FormBuilder,
    private levelSvc: ExamLevelService,
    private familySvc: ExamFamilyService,
    private router: Router
  ) {}

  ngOnInit() {
    // Build the form
    this.form = this.fb.group({
      familyId: ['', Validators.required],
      code: ['', Validators.required],
      name: ['', Validators.required],
      description: ['']
    });

    // Load families for the dropdown
    this.familySvc.getAll().subscribe(data => this.families = data);
  }
  onSubmit() {
    if (this.form.invalid) return;

    // Map familyId to family for backend compatibility
    const formData = {
      ...this.form.value,
      family: this.form.value.familyId
    };
    delete formData.familyId;

    this.levelSvc.create(formData).subscribe({
      next: level => {
        window.alert(`✅ Exam Level "${level.name}" added successfully.`);
        this.router.navigate(['/exam-levels']);
      },
      error: err => {
        const msg = err.error?.message || err.message || 'Unknown error';
        window.alert(`❌ Failed to add exam level: ${msg}`);
      }
    });
  }
}
