import { Component } from '@angular/core';
import * as Papa from 'papaparse';
import { QuestionService } from '../../services/question.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-csv-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
      console.log('📝 Selected file:', file.name);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          console.log('🧾 Raw CSV result:', result);

          const cleanedData = result.data.map((row: any) => {
            const cleanedRow: any = {};
            Object.keys(row).forEach(key => {
              const trimmedKey = key.trim();
              const trimmedValue = row[key]?.trim?.() ?? row[key];
              cleanedRow[trimmedKey] = trimmedValue;
            });
            return cleanedRow;
          });

          console.log('🧹 Cleaned Data:', cleanedData);
          this.parsedQuestions = cleanedData;
        },
        error: (error) => {
          console.error('❌ Parsing error:', error);
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
      const optionTexts = (q.options || '').split('|').map((s: string) => s.trim());
      const correctTexts = (q.correctOptions || '').split('|').map((s: string) => s.trim());

      const options = optionTexts.map((text: string) => ({
        text,
        isCorrect: correctTexts.includes(text)
      }));

      let explanations = [];
      try {
        explanations = q.explanations ? JSON.parse(q.explanations) : [];
      } catch {
        console.warn('Invalid explanations JSON:', q.explanations);
      }

      let askedIn = [];
      try {
        askedIn = q.askedIn ? JSON.parse(q.askedIn) : [];
      } catch {
        console.warn('Invalid askedIn JSON:', q.askedIn);
      }

      return {
        questionText: q.questionText?.trim(),
        options,
        correctOptions: correctTexts,
        explanation: q.explanation?.trim(),
        difficulty: this.validateEnum(q.difficulty, ['Easy', 'Medium', 'Hard'], 'Medium'),
        marks: parseFloat(q.marks) || 1,
        branch: q.branch?.trim(),
        subject: q.subject?.trim(),
        topic: q.topic?.trim(),
        subtopic: q.subtopic?.trim(),
        examType: q.examType?.trim(),
        explanations,
        askedIn,
        status: this.validateEnum(q.status, ['active', 'inactive'], 'active'),
        version: parseInt(q.version) || 1
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

  validateEnum(value: string, allowed: string[], fallback: string): string {
    const cleaned = value?.trim();
    return allowed.includes(cleaned) ? cleaned : fallback;
  }
}
