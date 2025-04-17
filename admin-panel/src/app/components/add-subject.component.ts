import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgForm, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QuestionService } from '../services/question.service';

@Component({
  selector: 'app-add-subject',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-subject.component.html',
  styleUrls: ['./add-subject.component.scss']
})
export class AddSubjectComponent implements OnInit {
  branches: any[] = [];
  selectedBranchId = '';
  subjectName = '';
  isLoading = false;

  constructor(
    private questionService: QuestionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.questionService.getBranches().subscribe({
      next: (res) => {
        this.branches = Array.isArray(res) ? res : res.branches || [];
      },
      error: (err) => {
        console.error('Failed to load branches', err);
      }
    });
  }

  submitSubject(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const payload = {
      name: this.subjectName,
      branchId: this.selectedBranchId === 'none' ? null : this.selectedBranchId
    };

    this.questionService.createSubject(payload).subscribe({
      next: () => {
        alert('Subject created successfully!');
        this.router.navigate(['/questions']);
      },
      error: (err) => {
        console.error('Error creating subject:', err);
        alert('Error creating subject. Please try again.');
        this.isLoading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/questions']);
  }
}
