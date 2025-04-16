import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuestionService } from '../../services/question.service';

@Component({
  selector: 'app-question-list',
  standalone: true,
  imports: [ CommonModule ],
  templateUrl: './question-list.component.html',
  styleUrls: ['./question-list.component.scss']
})
export class QuestionListComponent implements OnInit {
  private questionService = inject(QuestionService);
  private router = inject(Router);
  questions: any[] = [];

  /** Helper to load all questions */
  loadQuestions() {
    this.questionService.getQuestions().subscribe({
      next: data => {
        this.questions = Array.isArray(data) ? data : data.questions || [];
      },
      error: err => console.error('Error loading questions:', err)
    });
  }

  ngOnInit() {
    this.loadQuestions();
  }

  /** Delete a question and reload the list */
  onDelete(id: string) {
    if (!confirm('Are you sure you want to delete this question?')) return;
    this.questionService.deleteQuestion(id).subscribe({
      next: () => this.loadQuestions(),
      error: err => console.error('Error deleting question:', err)
    });
  }

  /** Navigate to the edit page */
  onEdit(id: string) {
    this.router.navigate(['/questions/edit', id]);
  }
}
