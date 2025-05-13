import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { TestService } from '../../services/test.service';
import { saveAs } from 'file-saver';
import { HttpClient } from '@angular/common/http';

// Define interfaces based on the expected structure of 'data'
interface Option {
  text: string;
  isCorrect: boolean;
  _id: string;
}

interface FullQuestion {
  question: string; // This is the ID
  marks: number;
  questionText: string;
  options: Option[];
  type: string;
  difficulty: string;
  _id: string; // Internal ID for this question instance in sections
}

interface Section {
  title: string;
  order: number;
  questions: FullQuestion[];
}

interface ResponseItem { // Renamed from Response to avoid conflict if Response is a global type
  question: { _id: string };
  selected: string[];
  correctOptions: any[]; // Kept as any[] as it was empty in JSON
  earned: number;
  review: boolean;
  _id: string;
  questionData?: FullQuestion; // Added property
  populatedCorrectOptions?: string[]; // Added property
}

interface Attempt {
  _id: string;
  series: any; // or string if not populated
  student: any; // or string if not populated
  responses: ResponseItem[];
  startedAt: string;
  status: string;
  expiresAt: string;
  remainingDurationSeconds: number;
  attemptNo: number;
  sections: Section[];
}

// Added interface for display
interface DisplayedSectionReview {
  title: string;
  order: number;
  responses: ResponseItem[];
}

@Component({
  selector: 'app-review-attempt',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './review-attempt.component.html',
  styleUrls: ['./review-attempt.component.scss']
})
export class ReviewAttemptComponent implements OnInit {
  attemptId!: string;
  loading = true;
  error = '';
  attempt: Attempt | undefined; // Use the Attempt interface
  displayedSections: DisplayedSectionReview[] = []; // Added property

  constructor(
    private route: ActivatedRoute,
    private testSvc: TestService,
    private http: HttpClient // ← inject HttpClient
  ) {}

  ngOnInit() {
    this.attemptId = this.route.snapshot.paramMap.get('attemptId')!;
    this.loading = true; // Set loading to true before the call
    this.testSvc.reviewAttempt(this.attemptId).subscribe({
      next: (data: any) => { // Explicitly type data as any for now, or create a more specific DTO if backend structure is stable
        console.log('FE: ReviewAttemptComponent - Data received:', JSON.stringify(data, null, 2));
        this.attempt = data as Attempt; // Cast to our defined Attempt interface

        if (this.attempt && this.attempt.responses && this.attempt.sections) {
          const questionDetailsMap = new Map<string, FullQuestion>();
          this.attempt.sections.forEach((section: Section) => {
            if (section.questions && Array.isArray(section.questions)) {
              section.questions.forEach((fq: FullQuestion) => {
                questionDetailsMap.set(fq.question, fq); // fq.question is the ID
              });
            }
          });

          this.attempt.responses.forEach((response: ResponseItem) => {
            const fullQuestion = questionDetailsMap.get(response.question._id);
            if (fullQuestion) {
              response.questionData = fullQuestion;

              if (fullQuestion.options && Array.isArray(fullQuestion.options)) {
                response.populatedCorrectOptions = fullQuestion.options
                                                    .filter((opt: Option) => opt.isCorrect)
                                                    .map((opt: Option) => opt.text);
              } else {
                response.populatedCorrectOptions = [];
              }
            }
          });

          // New logic to populate displayedSections
          this.displayedSections = [];
          // Ensure this.attempt is defined before sorting its sections
          if (this.attempt && this.attempt.sections) {
            this.attempt.sections.sort((a, b) => a.order - b.order); // Ensure sections are ordered

            this.attempt.sections.forEach(sectionFromBackend => {
              const responsesForThisSection: ResponseItem[] = [];
              // sectionFromBackend.questions are the questions in their presented order for this attempt
              sectionFromBackend.questions.forEach(questionDetailInSec => { // questionDetailInSec is a FullQuestion
                // Ensure this.attempt and this.attempt.responses are defined before finding a response
                const matchingResponse = this.attempt?.responses.find(
                  resp => resp.question._id === questionDetailInSec.question // .question is the ID
                );
                if (matchingResponse) {
                  // matchingResponse is already enriched from the loop above
                  responsesForThisSection.push(matchingResponse);
                }
                // If no matchingResponse, it means a question in the section structure
                // didn't have a corresponding entry in attempt.responses.
                // This shouldn't happen if every presented question gets a response slot.
                // For review, we only show what has a response.
              });

              if (responsesForThisSection.length > 0) {
                this.displayedSections.push({
                  title: sectionFromBackend.title,
                  order: sectionFromBackend.order,
                  responses: responsesForThisSection
                });
              }
            });
          }
        }
        this.loading = false;
      },
      error: (err: any) => {
        console.error('FE: ReviewAttemptComponent - Error loading review:', err);
        this.error = err.error?.message || 'Failed to load review data';
        this.loading = false;
      }
    });
  }

  getGlobalQuestionNumberForReview(sectionIdx: number, questionInSectionIdx: number): number {
    let globalIndex = 0;
    for (let i = 0; i < sectionIdx; i++) {
      // Ensure displayedSections and its elements are defined
      if (this.displayedSections && this.displayedSections[i] && this.displayedSections[i].responses) {
        globalIndex += this.displayedSections[i].responses.length;
      }
    }
    globalIndex += questionInSectionIdx;
    return globalIndex + 1;
  }

  // Helper to render the student’s answer text
  getAnswerText(r: ResponseItem): string {
    if (!r) return 'Response data missing';

    // Handle unanswered questions (selected array might be empty or contain an empty string)
    if (!r.selected?.length || r.selected[0] === "") {
      return (r.questionData && r.questionData.options) ? 'No answer' : 'Question data or options not available for unanswered';
    }

    if (!r.questionData || !r.questionData.options || !Array.isArray(r.questionData.options)) {
      return 'Options data not available for this question';
    }

    return r.selected
      .map((selectedIndex: string | number) => {
        const idx = Number(selectedIndex);
        if (idx >= 0 && idx < r.questionData!.options.length && r.questionData!.options[idx]) {
          return r.questionData!.options[idx].text || `Option ${idx + 1} text missing`;
        }
        return `Invalid option index: ${selectedIndex}`;
      })
      .join(', ');
  }

  // Helper to render the correct answer texts
  getCorrectText(r: ResponseItem): string {
    if (!r) return 'Response data missing';

    // Log the options being checked
    if (r.questionData && r.questionData.options) {
      console.log('getCorrectText - Checking r.questionData.options for Q_ID:', r.questionData.question, r.questionData.options);
    } else {
      console.log('getCorrectText - r.questionData or r.questionData.options is missing for response:', r);
    }

    if (!r.populatedCorrectOptions || !Array.isArray(r.populatedCorrectOptions) || r.populatedCorrectOptions.length === 0) {
      if (r.questionData && r.questionData.options) {
         const hasAnyCorrectOption = r.questionData.options.some((opt: Option) => opt.isCorrect);
         console.log('getCorrectText - hasAnyCorrectOption based on opt.isCorrect:', hasAnyCorrectOption, 'for Q_ID:', r.questionData.question);
         return hasAnyCorrectOption ? 'Correct answer text not processed' : 'Correct answer not specified in question data';
      }
      return 'Correct answer N/A';
    }
    return r.populatedCorrectOptions.join(', ');
  }

  downloadPdf(): void {
    const url = `http://localhost:5000/api/tests/${this.attemptId}/pdf`;
    this.http.get(url, {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
    }).subscribe({
      next: (blob: Blob) => saveAs(blob, `scorecard-${this.attemptId}.pdf`),
      error: (err: any) =>
        alert(err.error?.message || 'PDF download failed')
    });
  }
}
