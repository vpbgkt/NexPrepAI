import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-question',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-question.component.html',
  styleUrls: ['./add-question.component.scss'], // or remove if the CSS file is missing
})
export class AddQuestionComponent {
  question = {
    questionText: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
    difficulty: '',
    branch: '',
    subject: '',
    topic: '',
    subtopic: '',
  };

  branches: any[] = [];
  subjects: any[] = [];
  topics: any[] = [];
  subtopics: any[] = [];

  addQuestion() {
    console.log('Form submitted:', this.question);
    // TODO: Add your actual API POST logic here
  }
}
