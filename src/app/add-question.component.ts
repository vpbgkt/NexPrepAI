import { Component } from '@angular/core';
import { QuestionService } from '../services/question.service';

@Component({
  selector: 'app-add-question',
  templateUrl: './add-question.component.html',
  styleUrls: ['./add-question.component.css']
})
export class AddQuestionComponent {
  questionText = '';
  options = ['', '', '', ''];
  correctAnswers: number[] = [];

  constructor(private questionService: QuestionService) {}

  toggleCorrect(index: number): void {
    if (this.correctAnswers.includes(index)) {
      this.correctAnswers = this.correctAnswers.filter(i => i !== index);
    } else {
      this.correctAnswers.push(index);
    }
  }

  submit(): void {
    const data = {
      questionText: this.questionText,
      options: this.options,
      correctAnswers: this.correctAnswers
    };

    this.questionService.addQuestion(data).subscribe({
      next: () => {
        alert('✅ Question added successfully!');
        this.resetForm();
      },
      error: (err) => {
        console.error('❌ Error:', err);
        alert('Failed to add question.');
      }
    });
  }

  resetForm(): void {
    this.questionText = '';
    this.options = ['', '', '', ''];
    this.correctAnswers = [];
  }
}
