import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { QuestionService } from '../services/question.service';

@Component({
  selector: 'app-add-topic',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-topic.component.html',
  styleUrls: ['./add-topic.component.scss']
})
export class AddTopicComponent implements OnInit {
  branches: any[] = [];
  subjects: any[] = [];
  selectedBranchId = '';
  selectedSubjectId = '';
  topicName = '';
  isLoading = false;

  constructor(
    private questionService: QuestionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.questionService.getBranches().subscribe({
      next: (res: any) => {
        this.branches = Array.isArray(res) ? res : res.branches || [];
      },
      error: (err: any) => {
        console.error('Failed to load branches', err);
      }
    });
  }

  onBranchChange(): void {
    if (this.selectedBranchId === 'none') {
      this.subjects = [];
      this.selectedSubjectId = '';
      return;
    }

    this.questionService.getSubjects(this.selectedBranchId).subscribe({
      next: (res: any) => {
        this.subjects = res.subjects || res;
      },
      error: (err: any) => {
        console.error('Failed to load subjects', err);
      }
    });
  }

  submitTopic(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const payload = {
      name: this.topicName,
      subjectId: this.selectedSubjectId === 'none' ? null : this.selectedSubjectId
    };

    this.questionService.createTopic(payload).subscribe({
      next: () => {
        alert('Topic created successfully!');
        this.router.navigate(['/questions']);
      },
      error: (err: any) => {
        console.error('Error creating topic:', err);
        alert('Error creating topic. Please try again.');
        this.isLoading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/questions']);
  }
}
