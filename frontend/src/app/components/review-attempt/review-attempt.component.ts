/**
 * Review Attempt Component
 * Displays detailed review of a completed test attempt with questions, answers, and scoring
 * Input: attemptId from route parameters
 * Output: Renders test review UI with PDF download functionality
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { TestService } from '../../services/test.service';
import { saveAs } from 'file-saver';
import { HttpClient } from '@angular/common/http';

// Define interfaces based on the expected structure of 'data'

/**
 * Represents a multiple choice option in a question
 * Contains text, correctness flag, and unique identifier
 */
interface Option {
  text: string;
  isCorrect: boolean;
  _id: string;
}

/**
 * Complete question data structure with all metadata
 * Includes question content, options, scoring, and difficulty level
 */
interface FullQuestion {
  question: string; // This is the ID
  marks: number;
  negativeMarks?: number; // Added
  questionText: string;
  options: Option[];
  type: string;
  difficulty: string;
  _id: string; // Internal ID for this question instance in sections
}

/**
 * Test section containing grouped questions
 * Represents organizational structure of the test
 */
interface Section {
  title: string;
  order: number;
  questions: FullQuestion[];
}

/**
 * Student's response to a specific question
 * Contains selected answers, scoring, and review status
 */
interface ResponseItem { // Renamed from Response to avoid conflict if Response is a global type
  question: string; // MODIFIED: This is the ID of the master question
  selected: string[];
  correctOptions: any[]; // Kept as any[] as it was empty in JSON
  earned: number;
  review: boolean;
  _id: string;
  questionData?: FullQuestion; // Added property
  populatedCorrectOptions?: string[]; // Added property
}

/**
 * Complete test attempt record
 * Contains all student responses, timing, and test metadata
 */
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

/**
 * Interface for organizing responses by section for display
 * Groups responses under their respective test sections
 */
interface DisplayedSectionReview {
  title: string;
  order: number;
  responses: ResponseItem[];
}

@Component({
    selector: 'app-review-attempt',
    imports: [CommonModule, RouterModule],
    templateUrl: './review-attempt.component.html',
    styleUrls: []
})
export class ReviewAttemptComponent implements OnInit {
  attemptId!: string;
  loading = true;
  error = '';
  attempt: Attempt | undefined; // Use the Attempt interface
  displayedSections: DisplayedSectionReview[] = []; // Added property
  
  // To map responses from the flat list to the structured sections by index
  private flatResponseIndex = 0; 
  constructor(
    private route: ActivatedRoute,
    private testSvc: TestService,
    private http: HttpClient // ← inject HttpClient
  ) {}

  /**
   * Component initialization
   * Fetches attempt ID from route and loads review data from backend
   * Input: attemptId from route parameters
   * Output: Populates component with attempt data and organizes by sections
   */
  ngOnInit() {
    this.attemptId = this.route.snapshot.paramMap.get('attemptId')!;
    this.loading = true; // Set loading to true before the call
    this.testSvc.reviewAttempt(this.attemptId).subscribe({
      next: (data: any) => {
        console.log('FE: ReviewAttemptComponent - Data received:', JSON.stringify(data, null, 2));
        this.attempt = data as Attempt; 

        if (this.attempt && this.attempt.responses && this.attempt.sections) {
          // The backend now sends responses in the order of question slots.
          // The `attempt.responses` array itself should have `questionData` and `earned` marks
          // correctly calculated by the backend for each slot.

          // 1. Create a map of question master details (text, options, type) for quick lookup
          const questionMasterDetailsMap = new Map<string, FullQuestion>();
          this.attempt.sections.forEach((section: Section) => {
            if (section.questions && Array.isArray(section.questions)) {
              section.questions.forEach((fq: FullQuestion) => {
                // fq.question is the ID, fq itself contains text, options, type etc.
                // This map is for the *master* details of a question ID.
                if (!questionMasterDetailsMap.has(fq.question)) {
                    questionMasterDetailsMap.set(fq.question, fq);
                }
              });
            }
          });

          // 2. Enrich each response in attempt.responses with its master question data
          //    The backend should ideally do this, but if not, we can do it here.
          //    The `attempt.responses` from backend already has `question._id`.
          //    And `attempt.sections[s].questions[q]` has the full question detail for that slot.
          //    The `earned` marks are already calculated by the backend per response slot.

          // 3. Reconstruct displayedSections ensuring each slot gets its specific response from the ordered list.
          this.displayedSections = [];
          this.flatResponseIndex = 0; // Reset for each time data is processed

          if (this.attempt && this.attempt.sections) {
            this.attempt.sections.sort((a, b) => a.order - b.order); 

            this.attempt.sections.forEach(sectionFromBackend => {
              const responsesForThisDisplayedSection: ResponseItem[] = [];
              
              sectionFromBackend.questions.forEach(questionSlotDetails => { // questionSlotDetails is a FullQuestion from the section structure
                if (this.attempt && this.attempt.responses && this.flatResponseIndex < this.attempt.responses.length) {
                  const responseForThisSlot = this.attempt.responses[this.flatResponseIndex];

                  // Sanity check: Does the question ID in the response match the current question slot's ID?
                  if (responseForThisSlot.question === questionSlotDetails.question) { // MODIFIED comparison
                    // Populate questionData for the response if not already robustly populated by backend
                    // The `questionSlotDetails` IS the full data for this specific slot.
                    responseForThisSlot.questionData = questionSlotDetails;
                    
                    // Populate correct options text for display if not already done
                    if (questionSlotDetails.options && Array.isArray(questionSlotDetails.options)) {
                        responseForThisSlot.populatedCorrectOptions = questionSlotDetails.options
                                                                .filter((opt: Option) => opt.isCorrect)
                                                                .map((opt: Option) => opt.text);
                    } else {
                        responseForThisSlot.populatedCorrectOptions = [];
                    }
                    
                    responsesForThisDisplayedSection.push(responseForThisSlot);
                  } else {
                    console.warn(`Mismatched question ID at flatResponseIndex ${this.flatResponseIndex}. Expected ${questionSlotDetails.question}, found ${responseForThisSlot.question}. Skipping this response for display in this slot.`); // MODIFIED console warning
                    // We might need a placeholder or error display for this slot.
                    // For now, it just means this slot in the section won't show a response.
                  }
                  this.flatResponseIndex++;
                } else {
                  console.warn(`Ran out of responses in attempt.responses while processing section ${sectionFromBackend.title}, question ${questionSlotDetails.question}`);
                }
              });

              if (responsesForThisDisplayedSection.length > 0) {
                this.displayedSections.push({
                  title: sectionFromBackend.title,
                  order: sectionFromBackend.order,
                  responses: responsesForThisDisplayedSection 
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

  /**
   * Calculates global question number across all sections
   * Input: sectionIdx (section index), questionInSectionIdx (question index within section)
   * Output: Global question number for display (1-based indexing)
   */
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

  /**
   * Renders student's selected answer as human-readable text
   * Input: ResponseItem containing selected answer indices and question data
   * Output: Formatted string of selected option texts or error message
   */
  getAnswerText(r: ResponseItem): string {
    if (!r) return 'Response data missing';

    if (!r.selected?.length || (r.selected.length === 1 && r.selected[0] === "")) { // Check for empty string too
      return 'No answer';
    }

    if (!r.questionData || !r.questionData.options || !Array.isArray(r.questionData.options)) {
      // This might happen if questionData was not populated correctly for this response
      return 'Question/Options data not available';
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

  /**
   * Renders correct answer(s) as human-readable text
   * Input: ResponseItem with populated correct options
   * Output: Formatted string of correct option texts
   */
  getCorrectText(r: ResponseItem): string {
    if (!r) return 'Response data missing';

    if (!r.populatedCorrectOptions || !Array.isArray(r.populatedCorrectOptions) || r.populatedCorrectOptions.length === 0) {
      return 'Correct answer N/A'; // Or 'Not specified'
    }
    return r.populatedCorrectOptions.join(', ');
  }

  /**
   * Downloads test attempt scorecard as PDF
   * Input: None (uses component's attemptId)
   * Output: Triggers PDF download or shows error alert
   */
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
