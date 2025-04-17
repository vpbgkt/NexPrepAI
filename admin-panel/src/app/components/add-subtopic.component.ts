import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { QuestionService } from '../services/question.service';

@Component({
  selector: 'app-add-subtopic',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-subtopic.component.html',
  styleUrls: ['./add-subtopic.component.scss']
})
export class AddSubtopicComponent implements OnInit {
  branches: any[] = [];
  subjects: any[] = [];
  topics: any[] = [];
  selectedBranchId = '';
  selectedSubjectId = '';
  selectedTopicId = '';
  subtopicName = '';
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

  onSubjectChange(): void {
    if (this.selectedSubjectId === 'none') {
      this.topics = [];
      this.selectedTopicId = '';
      return;
    }

    this.questionService.getTopics(this.selectedSubjectId).subscribe({
      next: (res: any) => {
        this.topics = res.topics || res;
      },
      error: (err: any) => {
        console.error('Failed to load topics', err);
      }
    });
  }

  submitSubtopic(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const payload = {
      name: this.subtopicName,
      topicId: this.selectedTopicId === 'none' ? null : this.selectedTopicId
    };

    this.questionService.createSubtopic(payload).subscribe({
      next: () => {
        alert('Subtopic created successfully!');
        this.router.navigate(['/questions']);
      },
      error: (err: any) => {
        console.error('Error creating subtopic:', err);
        alert('Error creating subtopic. Please try again.');
        this.isLoading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/questions']);
  }
}
