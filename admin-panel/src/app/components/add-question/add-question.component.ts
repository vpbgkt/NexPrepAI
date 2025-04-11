import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuestionService } from '../../services/question.service';
import { Question } from '../../models/question.model';

@Component({
  selector: 'app-add-question',
  templateUrl: './add-question.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AddQuestionComponent {
  question: Question = {
    text: '',
    options: ['', '', '', ''],
    correctOption: 0,
    branch: '',
    subject: '',
    topic: '',
    subtopic: ''
  };

  constructor(private questionService: QuestionService) {}

  submitQuestion() {
    this.questionService.addQuestion(this.question).subscribe({
      next: () => alert('Question submitted successfully!'),
      error: (err) => console.error('Submission failed:', err)
    });
  }
}
