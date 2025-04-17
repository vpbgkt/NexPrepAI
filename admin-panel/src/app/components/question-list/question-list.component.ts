import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuestionService } from '../../services/question.service';
import { Question } from '../../models/question.model';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-question-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './question-list.component.html',
  styleUrls: ['./question-list.component.scss']
})
export class QuestionListComponent implements OnInit {
  questions: Question[] = [];
  branches: any[] = [];
  subjects: any[] = [];
  topics: any[] = [];
  subtopics: any[] = [];

  filters = {
    branch: '',
    subject: '',
    topic: '',
    subtopic: '',
    difficulty: ''
  };

  constructor(private questionService: QuestionService, private router: Router) {}

  ngOnInit(): void {
    this.loadBranches();
    this.loadQuestions();
  }

  loadBranches(): void {
    this.questionService.getBranches().subscribe({
      next: (res: any) => {
        this.branches = res.branches || res;
      },
      error: (err: any) => {
        console.error('Failed to load branches:', err);
      }
    });
  }

  onBranchChange(): void {
    this.subjects = [];
    this.topics = [];
    this.subtopics = [];

    if (this.filters.branch) {
      this.questionService.getSubjects(this.filters.branch).subscribe({
        next: (res: any) => {
          this.subjects = res.subjects || res;
        },
        error: (err: any) => {
          console.error('Failed to load subjects:', err);
        }
      });
    }
  }

  onSubjectChange(): void {
    this.topics = [];
    this.subtopics = [];

    if (this.filters.subject) {
      this.questionService.getTopics(this.filters.subject).subscribe({
        next: (res: any) => {
          this.topics = res.topics || res;
        },
        error: (err: any) => {
          console.error('Failed to load topics:', err);
        }
      });
    }
  }

  onTopicChange(): void {
    this.subtopics = [];

    if (this.filters.topic) {
      this.questionService.getSubtopics(this.filters.topic).subscribe({
        next: (res: any) => {
          this.subtopics = res.subtopics || res;
        },
        error: (err: any) => {
          console.error('Failed to load subtopics:', err);
        }
      });
    }
  }

  applyFilters(): void {
    if (!this.filters.branch) {
      alert('Please select at least a Branch to filter.');
      return;
    }

    this.questionService.filterQuestions(this.filters).subscribe({
      next: (res: any) => {
        this.questions = res;
      },
      error: (err: any) => {
        console.error('Failed to fetch filtered questions:', err);
      }
    });
  }

  loadQuestions(): void {
    this.questionService.getQuestions().subscribe((data) => {
      this.questions = data;
    });
  }

  onEdit(id: string): void {
    this.router.navigate(['/questions', id, 'edit']);
  }

  onDelete(id: string): void {
    if (confirm('Are you sure you want to delete this question?')) {
      this.questionService.deleteQuestion(id).subscribe(() => {
        this.loadQuestions(); // refresh list after deletion
      });
    }
  }
}
