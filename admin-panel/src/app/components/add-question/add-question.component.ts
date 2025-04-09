import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-add-question',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-question.component.html',
  styleUrls: ['./add-question.component.scss']
})
export class AddQuestionComponent {
  question = {
    text: '',
    options: ['', '', '', ''],
    correctOption: 0
  };

  constructor(private http: HttpClient) {}

  submitQuestion() {
    this.http.post('http://localhost:3000/api/questions/add', this.question)
      .subscribe({
        next: (response) => {
          console.log('Question added:', response);
          alert('Question added successfully!');
        },
        error: (error) => {
          console.error('Error adding question:', error);
          alert('Error adding question!');
        },
        complete: () => {
          console.log('Request completed.');
        }
      });
  }
}
