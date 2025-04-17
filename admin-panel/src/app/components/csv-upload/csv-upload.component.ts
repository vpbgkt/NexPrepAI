import { Component } from '@angular/core';
import * as Papa from 'papaparse';
import { QuestionService } from '../../services/question.service';
import { CommonModule } from '@angular/common'; // ✅ needed for *ngIf
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-csv-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],  // ✅ ensure this is added
  templateUrl: './csv-upload.component.html',
  styleUrls: ['./csv-upload.component.scss']
})
export class CsvUploadComponent {
  parsedQuestions: any[] = [];
  uploadMessage = '';

  constructor(private questionService: QuestionService) {}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          console.log('Parsed CSV:', result.data);
          this.parsedQuestions = result.data;
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
        }
      });
    }
  }

  submitToBackend() {
    if (this.parsedQuestions.length === 0) {
      this.uploadMessage = 'No data to upload.';
      return;
    }
  
    const formattedQuestions = this.parsedQuestions.map((q: any) => {
      const options = [];
      for (let i = 1; i <= 10; i++) {
        const optText = q[`option${i}`];
        if (optText) {
          options.push({
            text: optText,
            isCorrect: q.correctOptions?.split(',').includes(String(i))
          });
        }
      }
  
      return {
        questionText: q.questionText,
        options: options,
        explanation: q.explanation || '',
        difficulty: q.difficulty || '',
        branch: q.branchId || q.branch || null,
        subject: q.subjectId || q.subject || null,
        topic: q.topicId || q.topic || null,
        subtopic: q.subtopicId || q.subtopic || null
      };
    });
  
    this.questionService.importQuestions(formattedQuestions).subscribe({
      next: (res) => {
        this.uploadMessage = 'CSV uploaded successfully!';
        this.parsedQuestions = [];
      },
      error: (err) => {
        this.uploadMessage = 'Upload failed. Check console.';
        console.error(err);
      }
    });
  }
  
}
