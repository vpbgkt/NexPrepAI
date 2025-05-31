import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { QuestionService } from '../../services/question.service';
import { Question, PopulatedHierarchyField } from '../../models/question.model'; // Ensure PopulatedHierarchyField is imported

@Component({
  selector: 'app-question-review',
  standalone: true, // Already standalone from generation
  imports: [CommonModule, RouterModule], // Add CommonModule and RouterModule
  templateUrl: './question-review.component.html',
  styleUrl: './question-review.component.scss'
})
export class QuestionReviewComponent implements OnInit {
  private questionService = inject(QuestionService);

  questions: Question[] = [];
  isLoading = false;
  errorMessage = '';

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 10; // Or any default you prefer
  totalItems = 0;

  ngOnInit(): void {
    this.loadPendingQuestions();
  }

  loadPendingQuestions(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.questionService.getQuestionsByStatus('Pending Review', this.currentPage, this.itemsPerPage)
      .subscribe({
        next: (response: any) => {
          this.questions = response.questions.map((q: any) => {
            // Ensure _id is a string
            if (q._id && typeof q._id === 'object' && q._id.$oid) {
              q._id = q._id.$oid;
            }
            // Ensure branch, subject, topic, subTopic IDs are strings if they are objects
            ['branch', 'subject', 'topic', 'subTopic'].forEach(key => {
              if (q[key] && typeof q[key] === 'object' && q[key]._id) {
                // If it's a populated object, keep it as is for template access to .name
                // If it's just an ID object like { $oid: 'someId' }, convert to string
                if (q[key].$oid) { q[key] = q[key].$oid; }
              }
            });
            return q;
          });
          this.totalItems = response.totalCount;
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load questions. Please try again later.';
          console.error('Error fetching pending questions:', err);
          this.isLoading = false;
        }
      });
  }

  approveQuestion(questionId: string): void {
    this.updateQuestionStatus(questionId, 'Published');
  }

  rejectQuestion(questionId: string): void {
    this.updateQuestionStatus(questionId, 'draft');
  }

  private updateQuestionStatus(questionId: string, status: string): void {
    this.isLoading = true; // Optional: show loading state during status update
    this.questionService.updateQuestionStatus(questionId, status)
      .subscribe({
        next: () => {
          // Refresh the list of questions after status update
          this.loadPendingQuestions();
          // Optionally, show a success message
        },
        error: (err) => {
          this.errorMessage = `Failed to update question status to ${status}.`;
          console.error(`Error updating question ${questionId} to ${status}:`, err);
          this.isLoading = false; // Reset loading state on error
        }
      });
  }

  // Helper methods for template
  getQuestionText(question: Question, lang: string = 'en'): string {
    if (!question || !question.translations) return question.questionText || 'N/A';
    const translation = question.translations.find(t => t.lang === lang);
    return translation?.questionText || question.questionText || 'N/A';
  }

  getHierarchyName(field: string | { $oid: string } | PopulatedHierarchyField | undefined): string {
    if (typeof field === 'object' && field !== null && 'name' in field) {
      return (field as PopulatedHierarchyField).name;
    }
    return 'N/A';
  }

  getQuestionId(question: Question): string {
    if (typeof question._id === 'string') {
      return question._id;
    } else if (question._id && typeof question._id === 'object' && '$oid' in question._id) {
      return (question._id as { $oid: string }).$oid;
    }
    console.warn('Question ID is not in expected format (string or {$oid: string}):', question._id);
    return '';
  }

  toggleDetails(question: Question): void {
    question.expanded = !question.expanded;
  }

  // Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadPendingQuestions();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadPendingQuestions();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadPendingQuestions();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }
}
