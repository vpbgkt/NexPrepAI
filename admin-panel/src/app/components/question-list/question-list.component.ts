import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  questions: any[] = [];

  ngOnInit() {
    this.questionService.getQuestions().subscribe({
      next: data => {
        // adjust depending on your backend's shape
        this.questions = Array.isArray(data) ? data : data.questions || [];
      },
      error: err => console.error('Error loading questions:', err)
    });
  }
}
