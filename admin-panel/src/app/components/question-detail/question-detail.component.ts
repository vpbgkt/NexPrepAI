import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { QuestionService } from '../../services/question.service';
import { Question, PopulatedHierarchyField } from '../../models/question.model';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-question-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './question-detail.component.html',
  styleUrls: ['./question-detail.component.scss']
})
export class QuestionDetailComponent implements OnInit {
  question: Question | undefined;
  isLoading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private questionService: QuestionService
  ) {}

  ngOnInit(): void {
    const questionId = this.route.snapshot.paramMap.get('id');
    if (questionId) {
      this.questionService.getQuestionById(questionId).subscribe({
        next: (data) => {
          this.question = data;
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load question details.';
          console.error(err);
          this.isLoading = false;
        }
      });
    } else {
      this.errorMessage = 'Question ID not found.';
      this.isLoading = false;
    }
  }

  // Helper to get a specific translation
  getTranslation(langCode: string) {
    return this.question?.translations?.find(t => t.lang === langCode);
  }

  // Helper to get option text
  getOptionText(option: any): string {
    return option?.text || 'N/A';
  }

  // Helper to get string ID for display
  getIdString(idValue: any): string {
    if (!idValue) return '';
    if (typeof idValue === 'string') return idValue;
    if (idValue.$oid) return idValue.$oid;
    return String(idValue); // Fallback
  }

  // Helper to format date for the date pipe
  formatDate(dateValue: any): Date | null {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'string') return new Date(dateValue);
    // Handle MongoDB $date format if present
    if (dateValue.$date && dateValue.$date.$numberLong) {
      return new Date(parseInt(dateValue.$date.$numberLong, 10));
    }
    if (dateValue.$date) { // Fallback for other $date structures
        return new Date(dateValue.$date);
    }
    // Try to parse if it's a number (timestamp)
    if (typeof dateValue === 'number') return new Date(dateValue);
    return null; // Or throw an error, or handle as invalid date
  }

  // Helper to get name from populated hierarchy field or return the ID string
  getHierarchyName(field: string | PopulatedHierarchyField | { $oid: string } | undefined): string {
    if (!field) return 'N/A';
    if (typeof field === 'string') return field; // It's an ID
    if ((field as { $oid: string }).$oid) return (field as { $oid: string }).$oid; // It's an ObjectId as a string
    if ((field as PopulatedHierarchyField).name) return (field as PopulatedHierarchyField).name; // It's populated
    return 'Invalid Data';
  }

  // ADDED: Helper method to get display version
  getDisplayVersion(version: any): string {
    if (typeof version === 'object' && version !== null && version.hasOwnProperty('$numberInt')) {
      return version.$numberInt;
    }
    if (version === undefined || version === null) {
      return 'N/A';
    }
    return String(version);
  }
}
