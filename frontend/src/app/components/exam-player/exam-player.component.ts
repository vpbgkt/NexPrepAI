/**
 * @fileoverview Exam Player Component for NexPrep Frontend Application
 * @description Advanced Angular component responsible for delivering comprehensive online examination
 * experience with real-time progress tracking, multi-language support, question navigation,
 * auto-save functionality, and sophisticated timer management.
 * @module ExamPlayerComponent
 * @requires @angular/core
 * @requires @angular/common
 * @requires @angular/forms
 * @requires @angular/router
 * @requires TestService
 * @requires rxjs
 * @author NexPrep Development Team
 * @since 1.0.0
 */

import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormArray,
  FormGroup
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TestService, StartTestResponse } from '../../services/test.service'; // Ensure StartTestResponse is imported
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators'; // Import takeUntil
import { Subject, interval } from 'rxjs'; // Import Subject and interval

/**
 * @interface QuestionOption
 * @description Represents a single option for a multiple choice question
 */
interface QuestionOption {
  /** Option text content */
  text: string;
  /** Optional image URL for the option */
  img?: string;
  /** Whether this option is correct */
  isCorrect?: boolean;
  /** Unique identifier for the option */
  _id?: string;
}

/**
 * @interface QuestionTranslation
 * @description Multi-language translation data for questions
 */
interface QuestionTranslation {
  /** Language code (English or Hindi) */
  lang: 'en' | 'hi';
  /** Translated question text */
  questionText: string;
  /** Associated images for the question */
  images?: string[];
  /** Translated options */
  options: QuestionOption[];
}

/**
 * @interface QuestionHistoryItem
 * @description Historical performance data for a question
 */
interface QuestionHistoryItem {
  /** Test or exam title where question appeared */
  title: string;
  /** Date when question was attempted */
  askedAt: string | Date;
  /** Unique identifier for the history entry */
  _id?: string;
}

/**
 * @interface PlayerQuestion
 * @description Complete question data structure for exam player
 */
interface PlayerQuestion {
  /** Question unique identifier */
  question: string; 
  /** Multi-language translations */
  translations: QuestionTranslation[];
  /** Marks awarded for correct answer */
  marks?: number;
  /** Question type (single-choice, multiple-choice, etc.) */
  type?: string;
  /** Question difficulty level */
  difficulty?: string;
  /** Historical performance data */
  questionHistory?: QuestionHistoryItem[];
  /** Currently displayed question text */
  displayQuestionText: string;
  /** Currently displayed options */
  displayOptions: QuestionOption[];
  /** Languages available for this question */
  availableLanguages: string[];
  /** Original language used for display */
  originalLanguageForDisplay: string;
}

/**
 * @interface PlayerSection
 * @description Section structure containing questions for the exam player
 */
interface PlayerSection {
  /** Section title */
  title: string;
  /** Section display order */
  order: number;
  /** Questions in this section */
  questions: PlayerQuestion[];
}

/**
 * @class ExamPlayerComponent
 * @description Comprehensive exam delivery component providing full-featured online examination
 * experience with advanced capabilities including:
 * - Real-time exam timer with auto-submission
 * - Multi-language question support (English/Hindi)
 * - Sophisticated question navigation and status tracking
 * - Auto-save progress functionality with resumption capability
 * - Question flagging and review marking
 * - Responsive section and question management
 * - Time tracking per question and section
 * - Confidence level recording for performance analytics
 * - Comprehensive form validation and submission handling
 * 
 * @implements {OnInit}
 * @implements {OnDestroy}
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * // Component usage in template
 * <app-exam-player></app-exam-player>
 * 
 * // Navigation to exam player
 * this.router.navigate(['/exam', testSeriesId]);
 * 
 * // The component automatically:
 * // 1. Loads test data from route parameters
 * // 2. Checks for saved progress
 * // 3. Initializes form controls for all questions
 * // 4. Starts countdown timer
 * // 5. Enables auto-save functionality
 * // 6. Provides seamless question navigation
 * ```
 */
@Component({
    selector: 'app-exam-player',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './exam-player.component.html'
})
export class ExamPlayerComponent implements OnInit, OnDestroy {
  // Make String constructor available in template
  String = String;
  
  /** @property {string} Test series unique identifier from route parameters */
  seriesId!: string;
  
  /** @property {string} Display title of the current test series */
  testSeriesTitle: string = 'Loading Test...';
  
  /** @property {string} Current test attempt unique identifier */
  attemptId: string | undefined;
  
  /** @property {PlayerSection[]} Array of test sections with questions */
  sections: PlayerSection[] = [];
  
  /** @property {FormGroup} Reactive form managing all question responses */
  form: FormGroup;
  
  /** @property {number} Remaining time in seconds */
  timeLeft = 0;
  
  /** @property {any} Timer interval handle for countdown */
  timerHandle!: any;
  
  /** @property {boolean} Whether user has saved progress to resume */
  hasSavedProgress: boolean = false;
  
  /** @property {any[]} Previously saved response data */
  private savedResponses: any[] = [];

  /** @property {string} Pending attempt ID for progress resumption */
  private pendingAttemptId: string | undefined;
  
  /** @property {number} Pending time left for progress resumption */
  private pendingTimeLeft: number = 0;
  
  /** @property {any[]} Pending sections data for progress resumption */
  private pendingSections: any[] = [];
  
  /** @property {any[]} Pending saved responses for progress resumption */
  private pendingSavedResponses: any[] = [];

  /** @property {('en'|'hi')} Current display language for questions */
  currentLanguage: 'en' | 'hi' = 'en';
  
  /** @property {('en'|'hi')} Default language fallback */
  readonly defaultLanguage: 'en' | 'hi' = 'en';

  /** @property {number} Current section index being viewed */
  currentSectionIndex = 0;
  
  /** @property {number} Current question index within the section */
  currentQuestionInSectionIndex = 0;
  
  /** @property {number} Global question index across all sections */
  currentGlobalQuestionIndex = 0;

  /** @property {Map<number, Date>} Tracking when question viewing sessions start */
  private questionStartTimes: Map<number, Date> = new Map();

  /** @property {Object} Question status constants for template usage */
  readonly QuestionStatus = {
    ANSWERED: 'answered',
    UNANSWERED: 'unanswered',
    MARKED_FOR_REVIEW: 'marked-for-review'
  };
  /** @property {Subject<void>} RxJS subject for component destruction cleanup */
  private destroy$ = new Subject<void>();
  /** @property {boolean} Controls sidebar visibility on mobile devices */
  isSidebarVisible = false;

  /** @property {boolean} Indicates if auto-save is currently in progress */
  isAutoSaving = false;
  /** @property {string} Last auto-save status message */
  autoSaveStatus = '';
  /** @property {Date} Timestamp of last successful auto-save */
  lastSavedAt: Date | null = null;
  /** @property {boolean} Tracks if there are unsaved changes */
  hasUnsavedChanges = false;
  /** @property {string} JSON string of last saved form state for comparison */
  private lastSavedState = '';

  /**
   * @constructor
   * @description Initializes the ExamPlayerComponent with required dependencies and form setup
   * @param {FormBuilder} fb - Angular FormBuilder for reactive forms
   * @param {ActivatedRoute} route - Angular ActivatedRoute for parameter extraction
   * @param {Router} router - Angular Router for navigation
   * @param {TestService} testSvc - Test service for API operations
   * @param {ChangeDetectorRef} cd - Angular ChangeDetectorRef for manual change detection
   */
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private testSvc: TestService,
    private cd: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      // Each response will be a FormGroup with fields like:
      // question (id), selected, timeSpent, attempts, flagged, visitedAt, lastModifiedAt
      responses: this.fb.array([])
    });
  }

  /**
   * @method ngOnInit
   * @description Component initialization lifecycle hook. Extracts route parameters,
   * initializes component state, and checks for existing test progress.
   * 
   * @example
   * ```typescript
   * // Automatically called by Angular framework
   * // 1. Extracts seriesId from route parameters
   * // 2. Checks for saved progress via TestService
   * // 3. Sets up component state based on progress data
   * // 4. Prepares for test start or resume
   * ```
   */
  ngOnInit() {
    this.seriesId = this.route.snapshot.paramMap.get('seriesId')!;
    console.log(`ExamPlayer: ngOnInit for seriesId: ${this.seriesId}`);

    // Initialize title
    this.testSeriesTitle = 'Loading Test...';


    this.attemptId = undefined;
    this.hasSavedProgress = false;
    this.pendingAttemptId = undefined;
    this.pendingTimeLeft = 0;
    this.pendingSections = [];
    this.pendingSavedResponses = [];

    this.testSvc.getProgress(this.seriesId).subscribe({
      next: (progress: any) => {
        if (progress && progress.attemptId && progress.status !== 'expired') {
          console.log('Found in-progress test:', progress);
          this.pendingAttemptId = progress.attemptId;
          this.pendingTimeLeft = progress.remainingDurationSeconds;
          this.pendingSections = progress.sections || [];
          this.pendingSavedResponses = progress.responses || [];
          this.hasSavedProgress = true;
          this.testSeriesTitle = progress.seriesTitle || 'Test'; // Update title on loading progress
        } else if (progress && progress.status === 'expired') {
          console.log('Found an expired test attempt. User will need to submit or restart.');
          this.hasSavedProgress = false;
        } else {
          console.log('No active progress found or progress is invalid.');
          this.hasSavedProgress = false;
        }
      },
      error: (err: any) => {
        console.error('Error fetching progress:', err);
        this.hasSavedProgress = false;
      }
    });
  }

  /**
   * @method start
   * @description Initiates a new test session, clearing any previous progress
   * and starting fresh with the configured test series.
   * 
   * @example
   * ```typescript
   * // Called when user clicks "Start New Test" button
   * this.start();
   * // Resets all progress and starts new attempt
   * ```
   */
  start(): void {
    console.log('Starting new test...');
    this.hasSavedProgress = false;
    this.savedResponses = [];
    this.pendingAttemptId = undefined;
    this.currentSectionIndex = 0;
    this.currentQuestionInSectionIndex = 0;
    this.startNewTest();
  }

  /**
   * @method resumeTest
   * @description Resumes a previously saved test session with saved progress,
   * restoring question responses, timer state, and navigation position.
   * 
   * @example
   * ```typescript
   * // Called when user clicks "Resume Test" button
   * this.resumeTest();
   * // Restores: timer, responses, current question position
   * ```
   */
  resumeTest(): void {
    if (this.pendingAttemptId && this.pendingSections.length > 0) {
      console.log('Resuming test with ID:', this.pendingAttemptId);
      this.attemptId = this.pendingAttemptId;
      // pendingTimeLeft is already in seconds, so pass it directly for duration calculation in buildFormAndTimer
      this.buildFormAndTimer(this.pendingTimeLeft, this.pendingSections, this.pendingSavedResponses);
      this.hasSavedProgress = false;
    } else {
      console.log('No valid pending test to resume, starting new.');
      this.startNewTest();
    }
  }

  /**
   * @private
   * @method startNewTest
   * @description Initiates a fresh test session by calling the backend API.
   * Handles new test creation and initial setup of the examination environment.
   * 
   * @example
   * ```typescript
   * // Called internally when starting a new test
   * this.startNewTest();
   * // 1. Calls TestService.startTest() API
   * // 2. Receives: attemptId, duration, sections
   * // 3. Initializes: timer, form controls, navigation
   * ```
   */
  private startNewTest() {
    this.testSvc.startTest(this.seriesId).subscribe({
      next: (res: StartTestResponse) => {
        console.log('New test started successfully:', res);
        this.attemptId = res.attemptId;
        this.testSeriesTitle = (res as any).seriesTitle || 'Test'; // Use seriesTitle from response
        this.buildFormAndTimer((res as any).duration * 60, res.sections || [], []);
      },
      error: (err: any) => alert(err.error?.message || 'Failed to start test')
    });
  }
  /**
   * @private
   * @method attachAutoSave
   * @description Sets up comprehensive automatic progress saving with multiple triggers.
   * Implements smart debouncing, change detection, and various save triggers for optimal UX.
   * 
   * @example
   * ```typescript
   * // Called during test initialization
   * this.attachAutoSave();
   * // Features:
   * // - 2-second debounce for answer changes
   * // - Immediate save on navigation
   * // - Periodic backup save every 30 seconds
   * // - Browser event handling (beforeunload)
   * // - Smart change detection to avoid unnecessary saves
   * ```
   */
  private attachAutoSave() {
    // 1. Auto-save on form changes (debounced for 2 seconds)
    this.form.valueChanges
      .pipe(
        debounceTime(2000), // Wait 2 seconds after last change
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntil(this.destroy$)
      )
      .subscribe(vals => {
        console.log('Form value changed, triggering auto-save:', vals);
        this.checkForChanges();
        if (this.hasUnsavedChanges) {
          this.autoSaveProgress('answer_change');
        }
      });

    // 2. Periodic backup save every 30 seconds (safety net)
    interval(30000) // 30 seconds
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.checkForChanges();
        if (this.hasUnsavedChanges) {
          this.autoSaveProgress('periodic_backup');
        }
      });    // 3. Browser beforeunload event (save before page close)
    window.addEventListener('beforeunload', (event) => {
      this.checkForChanges();
      if (this.hasUnsavedChanges) {
        // Synchronous save for beforeunload
        this.saveProgressSync();
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
      return undefined;
    });

    // 4. Page visibility change (save when user switches tabs)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.checkForChanges();
        if (this.hasUnsavedChanges) {
          this.autoSaveProgress('visibility_change');
        }
      }
    });
  }

  /**
   * @getter responses
   * @description Provides typed access to the reactive form array containing all question responses.
   * Essential for form manipulation and response data access throughout the component.
   * 
   * @returns {FormArray} Reactive form array containing question response controls
   * 
   * @example
   * ```typescript
   * const responseControls = this.responses;
   * const firstResponse = responseControls.at(0);
   * const selectedAnswer = firstResponse.get('selected')?.value;
   * ```
   */
  get responses(): FormArray {
    return this.form.get('responses') as FormArray;
  }
  /**
   * @method submit
   * @description Submits the completed test attempt to the backend for evaluation.
   * Handles final time tracking, form cleanup, and navigation to review page.
   * 
   * @throws {Error} When no active attempt ID is available for submission
   * 
   * @example
   * ```typescript
   * // Called when user clicks "Submit Test" or time expires
   * this.submit();
   * // 1. Stops timer and auto-save
   * // 2. Updates final question time spent
   * // 3. Sends all responses to backend
   * // 4. Navigates to review page on success
   * ```
   */
  submit() {
    clearInterval(this.timerHandle);
    this.destroy$.next(); 
    this.destroy$.complete();
    this.updateQuestionTimeSpent(this.currentGlobalQuestionIndex); 
    
    if (!this.attemptId) {
      console.error('Submit called without an active attemptId.');
      alert('No active test attempt to submit.');
      return;
    }
    
    const payload = this.responses.controls.map(ctrl => {
      const controlValue = ctrl.value;
      // Log details for the specific question if its ID is known e.g. '681d899f3be3d02afaac6b8e'
      // You can uncomment and adapt this for specific debugging if needed:
      // if (controlValue.question === 'YOUR_SPECIFIC_QUESTION_ID_HERE') {
      //   console.log(`Value for question ${controlValue.question} at submit time:`, JSON.stringify(controlValue, null, 2));
      // }
      return controlValue;
    });
    
    console.log('Submitting payload (exam-player.component.ts):', JSON.stringify(payload, null, 2));
    
    this.testSvc.submitAttempt(this.attemptId, { responses: payload }).subscribe({
      next: (submissionResponse: any) => {
        console.log('Test submitted successfully, response:', submissionResponse);
        alert('Test submitted successfully!');
        this.router.navigate(['/review', this.attemptId]);
      },
      error: (err: any) => {
        console.error('Submission failed (exam-player.component.ts):', err);
        alert(err.error?.message || 'Submission failed');
      }
    });
  }

  /**
   * @method formatTime
   * @description Formats seconds into MM:SS time display format for the exam timer.
   * 
   * @param {number} sec - Total seconds to format
   * @returns {string} Formatted time string in MM:SS format
   * 
   * @example
   * ```typescript
   * const timeStr = this.formatTime(125);
   * console.log(timeStr); // "02:05"
   * 
   * const timeStr2 = this.formatTime(3661);
   * console.log(timeStr2); // "61:01"
   * ```
   */
  formatTime(sec: number): string {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
  /**
   * @private
   * @method initializeQuestionControls
   * @description Creates reactive form controls for each question with saved progress restoration.
   * Handles complex question instance keys and proper form state initialization.
   * 
   * @param {PlayerSection[]} sections - Array of test sections with questions
   * @param {any[]} savedResponses - Previously saved user responses for progress restoration
   * 
   * @example
   * ```typescript
   * // Called during test initialization or resume
   * this.initializeQuestionControls(this.sections, savedProgressData);
   * // Creates FormArray with controls for each question
   * // Restores: selected answers, time spent, flags, visit history
   * ```
   */
  private initializeQuestionControls(sections: PlayerSection[], savedResponses: any[]): void {
    const responsesArray = this.form.get('responses') as FormArray;
    responsesArray.clear(); // Clear existing controls

    let globalIndex = 0;
    sections.forEach((section, sectionIdx) => {
      section.questions.forEach((question, questionInSectionIdx) => {
        const questionId = question.question; // This is the actual ID of the question
        // Construct the key as it would be saved by the backend/autosave
        const questionInstanceKey = `${questionId}_${sectionIdx}_${questionInSectionIdx}`;

        const savedResponse = savedResponses.find(r => r.questionInstanceKey === questionInstanceKey);

        // Log the selected value from savedResponse
        if (savedResponse) {
          // console.log(`[initializeQuestionControls] For QIK ${questionInstanceKey}: savedResponse.selected is:`, savedResponse.selected);
        } else {
          // console.log(`[initializeQuestionControls] For QIK ${questionInstanceKey}: No savedResponse found.`);
        }

        let selectedValueToSetInForm: any[] = [];
        if (savedResponse && savedResponse.selected) {
          // Ensure `selected` is an array, as expected by checkbox/radio groups or multi-select
          selectedValueToSetInForm = Array.isArray(savedResponse.selected) ? savedResponse.selected : [savedResponse.selected];
        }
        // Log the value that will be set in the form
        // console.log(`[initializeQuestionControls] For QIK ${questionInstanceKey}: selectedValueToSetInForm for form is:`, selectedValueToSetInForm);

        // For single-choice questions, the form control expects a single value, not an array.
        // Extract the first item if the array is not empty, otherwise use null.
        const finalValueForFormControl = selectedValueToSetInForm.length > 0 ? selectedValueToSetInForm[0] : null;
        // console.log(`[initializeQuestionControls] For QIK ${questionInstanceKey}: finalValueForFormControl (single choice) is:`, finalValueForFormControl);


        responsesArray.push(this.fb.group({
          question: [questionId], // Store the actual question ID
          questionInstanceKey: [questionInstanceKey], // Store the unique key for this instance
          selected: [finalValueForFormControl], // Use the extracted single value or null
          timeSpent: [savedResponse?.timeSpent || 0],
          attempts: [savedResponse?.attempts || 0],
          flagged: [savedResponse?.flagged || false],
          confidence: [savedResponse?.confidence || null],
          visitedAt: [savedResponse?.visitedAt || null],
          lastModifiedAt: [savedResponse?.lastModifiedAt || null],
          review: [savedResponse?.review || null] // ADDED: To resolve console error
        }));
        globalIndex++;
      });
    });
    this.cd.detectChanges(); // Notify Angular of changes
  }
  
  /**
   * @private
   * @method buildFormAndTimer
   * @description Core initialization method that sets up the exam environment including
   * reactive forms, countdown timer, and question navigation state.
   * 
   * @param {number} durationInSeconds - Total exam duration in seconds
   * @param {any[]} sectionsFromServer - Raw section data from backend API
   * @param {any[]} savedResponses - Previously saved responses for progress restoration
   * 
   * @example
   * ```typescript
   * // Called during new test start or resume
   * this.buildFormAndTimer(3600, sectionsData, []);
   * // Sets up: 60-minute timer, form controls, initial navigation
   * ```
   */
  private buildFormAndTimer(durationInSeconds: number, sectionsFromServer: any[], savedResponses: any[]) {
    this.timeLeft = durationInSeconds;
    this.sections = this.transformSections(sectionsFromServer);
    this.initializeQuestionControls(this.sections, savedResponses); // Pass savedResponses here

    if (this.timerHandle) {
      clearInterval(this.timerHandle);
    }
    this.timerHandle = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        clearInterval(this.timerHandle);
        // Auto-submit or handle timeout
        this.submit(); 
      }    }, 1000);

    this.attachAutoSave(); // Enable auto-save functionality
    this.navigateToInitialQuestion();
    this.cd.detectChanges();
  }

  /**
   * @private
   * @method transformSections
   * @description Transforms raw section data from server into client-side PlayerSection format
   * with enhanced question display properties and language support.
   * 
   * @param {any[]} sectionsFromServer - Raw section data from backend API
   * @returns {PlayerSection[]} Transformed sections with display-ready question data
   * 
   * @example
   * ```typescript
   * const playerSections = this.transformSections(serverData);
   * // Transforms: raw questions → PlayerQuestion with display properties
   * // Adds: language support, display text, option formatting
   * ```
   */
  private transformSections(sectionsFromServer: any[]): PlayerSection[] {
    if (!sectionsFromServer) return [];
    return sectionsFromServer.map(section => ({
      ...section,
      questions: section.questions.map((q: any) => ({
        ...q,
        displayQuestionText: q.questionText, // Or logic to get from translations
        displayOptions: q.options, // Or logic to get from translations
        availableLanguages: q.translations?.map((t:any) => t.lang) || [this.defaultLanguage],
        originalLanguageForDisplay: this.defaultLanguage // Or determine based on content
      }))
    }));
  }

  /**
   * @private
   * @method navigateToInitialQuestion
   * @description Sets the exam player to the first question and initializes tracking.
   * Called after form setup to begin the examination session.
   * 
   * @example
   * ```typescript
   * // Called after buildFormAndTimer completes
   * this.navigateToInitialQuestion();
   * // Sets: currentSectionIndex=0, currentQuestionInSectionIndex=0
   * // Starts: question visit tracking and timing
   * ```
   */
  private navigateToInitialQuestion() {
    this.currentSectionIndex = 0;
    this.currentQuestionInSectionIndex = 0;
    this.currentGlobalQuestionIndex = 0;
    if (this.sections.length > 0 && this.sections[0].questions.length > 0) {
      this.trackQuestionVisit(this.currentGlobalQuestionIndex); 
    }
  }

  /**
   * @method goToQuestion
   * @description Navigates directly to a specific question by section and question indices.
   * Updates time tracking and visit history for proper analytics.
   * 
   * @param {number} sectionIdx - Target section index (0-based)
   * @param {number} questionInSectionIdx - Target question index within section (0-based)
   * 
   * @example
   * ```typescript
   * // Navigate to 3rd question in 2nd section
   * this.goToQuestion(1, 2);
   * // Updates: current indices, time tracking, visit history
   * // Triggers: change detection for UI updates
   * ```
   */  goToQuestion(sectionIdx: number, questionInSectionIdx: number) {
    if (this.sections[sectionIdx] && this.sections[sectionIdx].questions[questionInSectionIdx]) {
      this.updateQuestionTimeSpent(this.currentGlobalQuestionIndex);
      
      // Auto-save before navigation
      this.checkForChanges();
      if (this.hasUnsavedChanges) {
        this.autoSaveProgress('navigation');
      }

      this.currentSectionIndex = sectionIdx;
      this.currentQuestionInSectionIndex = questionInSectionIdx;
      this.currentGlobalQuestionIndex = this.getGlobalIndex(this.currentSectionIndex, this.currentQuestionInSectionIndex); 
      
      this.trackQuestionVisit(this.currentGlobalQuestionIndex);
      this.cd.detectChanges();
    }
  }

  /**
   * @method next
   * @description Navigates to the next question in sequence, handling section boundaries.
   * Automatically moves to next section when reaching end of current section.
   * 
   * @example
   * ```typescript
   * // Navigate to next question
   * this.next();
   * // Behavior:
   * // - Within section: moves to next question
   * // - End of section: moves to first question of next section
   * // - Last question: no movement (end of test)
   * ```
   */  next() {
    this.updateQuestionTimeSpent(this.currentGlobalQuestionIndex);
    
    // Auto-save before navigation
    this.checkForChanges();
    if (this.hasUnsavedChanges) {
      this.autoSaveProgress('navigation');
    }

    if (this.currentQuestionInSectionIndex < this.sections[this.currentSectionIndex].questions.length - 1) {
      this.currentQuestionInSectionIndex++;
    } else if (this.currentSectionIndex < this.sections.length - 1) {
      this.currentSectionIndex++;
      this.currentQuestionInSectionIndex = 0;
    } else {
      return;
    }
    this.currentGlobalQuestionIndex = this.getGlobalIndex(this.currentSectionIndex, this.currentQuestionInSectionIndex);
    this.trackQuestionVisit(this.currentGlobalQuestionIndex); 
    this.cd.detectChanges();
  }

  /**
   * @method prev
   * @description Navigates to the previous question in sequence, handling section boundaries.
   * Automatically moves to previous section when reaching beginning of current section.
   * 
   * @example
   * ```typescript
   * // Navigate to previous question
   * this.prev();
   * // Behavior:
   * // - Within section: moves to previous question
   * // - Start of section: moves to last question of previous section
   * // - First question: no movement (start of test)
   * ```
   */  prev() {
    this.updateQuestionTimeSpent(this.currentGlobalQuestionIndex); 
    
    // Auto-save before navigation
    this.checkForChanges();
    if (this.hasUnsavedChanges) {
      this.autoSaveProgress('navigation');
    }

    if (this.currentQuestionInSectionIndex > 0) {
      this.currentQuestionInSectionIndex--;
    } else if (this.currentSectionIndex > 0) {
      this.currentSectionIndex--;
      this.currentQuestionInSectionIndex = this.sections[this.currentSectionIndex].questions.length - 1;
    } else {
      return;
    }
    this.currentGlobalQuestionIndex = this.getGlobalIndex(this.currentSectionIndex, this.currentQuestionInSectionIndex);
    this.trackQuestionVisit(this.currentGlobalQuestionIndex); 
    this.cd.detectChanges();
  }

  /**
   * @method getGlobalIndex
   * @description Calculates the global question index from section and local question indices.
   * Essential for form control mapping and analytics tracking.
   * 
   * @param {number} sectionIdx - Section index (0-based)
   * @param {number} questionInSectionIdx - Question index within section (0-based)
   * @returns {number} Global question index across all sections
   * 
   * @example
   * ```typescript
   * // For question 2 in section 1 (assuming section 0 has 5 questions)
   * const globalIdx = this.getGlobalIndex(1, 2);
   * console.log(globalIdx); // 7 (5 from section 0 + 2 from section 1)
   * ```
   */
  getGlobalIndex(sectionIdx: number, questionInSectionIdx: number): number {
    let globalIndex = 0;
    for (let i = 0; i < sectionIdx; i++) {
      globalIndex += this.sections[i].questions.length;
    }
    globalIndex += questionInSectionIdx;
    return globalIndex;
  }

  /**
   * @method getGlobalQuestionNumber
   * @description Converts global index to human-readable question number (1-based).
   * Used for display purposes in UI elements.
   * 
   * @param {number} sectionIdx - Section index (0-based)
   * @param {number} questionInSectionIdx - Question index within section (0-based)
   * @returns {number} Human-readable question number (1-based)
   * 
   * @example
   * ```typescript
   * const questionNum = this.getGlobalQuestionNumber(0, 0);
   * console.log(questionNum); // 1 (first question)
   * 
   * const questionNum2 = this.getGlobalQuestionNumber(1, 2);
   * console.log(questionNum2); // 8 (assuming previous section had 5 questions)
   * ```
   */
  getGlobalQuestionNumber(sectionIdx: number, questionInSectionIdx: number): number {
    return this.getGlobalIndex(sectionIdx, questionInSectionIdx) + 1;
  }

  /**
   * @method isCurrentQuestion
   * @description Checks if the specified question is currently being viewed.
   * Used for UI highlighting and navigation state management.
   * 
   * @param {number} sectionIdx - Section index to check
   * @param {number} questionInSectionIdx - Question index to check
   * @returns {boolean} True if this is the currently viewed question
   * 
   * @example
   * ```typescript
   * const isCurrent = this.isCurrentQuestion(1, 3);
   * // Used in template: [class.active]="isCurrentQuestion(sectionIdx, questionIdx)"
   * ```
   */
  isCurrentQuestion(sectionIdx: number, questionInSectionIdx: number): boolean {
    return this.currentSectionIndex === sectionIdx && this.currentQuestionInSectionIndex === questionInSectionIdx;
  }
  
  /**
   * @method isCurrentQuestionByIndex
   * @description Checks if the specified global index is currently being viewed.
   * Alternative to isCurrentQuestion using global indexing.
   * 
   * @param {number} globalIdx - Global question index to check
   * @returns {boolean} True if this is the currently viewed question
   * 
   * @example
   * ```typescript
   * const isCurrent = this.isCurrentQuestionByIndex(5);
   * // Used for palette highlighting based on global index
   * ```
   */
  isCurrentQuestionByIndex(globalIdx: number): boolean {
    return this.currentGlobalQuestionIndex === globalIdx;
  }

  /**
   * @method isQuestionFlagged
   * @description Checks if a question is flagged for review using section/question indices.
   * 
   * @param {number} sectionIdx - Section index of the question
   * @param {number} questionInSectionIdx - Question index within the section
   * @returns {boolean} True if the question is flagged for review
   * 
   * @example
   * ```typescript
   * const isFlagged = this.isQuestionFlagged(1, 2);
   * // Used in template: [class.flagged]="isQuestionFlagged(sIdx, qIdx)"
   * ```
   */
  isQuestionFlagged(sectionIdx: number, questionInSectionIdx: number): boolean {
    const globalIndex = this.getGlobalIndex(sectionIdx, questionInSectionIdx);
    return this.isQuestionFlaggedByIndex(globalIndex);
  }

  /**
   * @method isQuestionFlaggedByIndex
   * @description Checks if a question is flagged for review using global index.
   * 
   * @param {number} globalIndex - Global question index
   * @returns {boolean} True if the question is flagged for review
   * 
   * @example
   * ```typescript
   * const isFlagged = this.isQuestionFlaggedByIndex(7);
   * // Direct lookup by global index for performance
   * ```
   */
  isQuestionFlaggedByIndex(globalIndex: number): boolean {
    const formCtrl = this.responses.at(globalIndex);
    return formCtrl ? formCtrl.get('flagged')?.value || false : false;
  }

  /**
   * @method isFirstQuestionOverall
   * @description Determines if currently viewing the very first question of the entire test.
   * Used for navigation control and UI state management.
   * 
   * @returns {boolean} True if on the first question of the test
   * 
   * @example
   * ```typescript
   * const isFirst = this.isFirstQuestionOverall();
   * // Used to disable "Previous" button: [disabled]="isFirstQuestionOverall()"
   * ```
   */
  isFirstQuestionOverall(): boolean {
    return this.currentSectionIndex === 0 && this.currentQuestionInSectionIndex === 0;
  }

  /**
   * @method isLastQuestionOverall
   * @description Determines if currently viewing the very last question of the entire test.
   * Used for navigation control and submit button display logic.
   * 
   * @returns {boolean} True if on the last question of the test
   * 
   * @example
   * ```typescript
   * const isLast = this.isLastQuestionOverall();
   * // Used to show submit button: *ngIf="isLastQuestionOverall()"
   * // Used to disable "Next" button: [disabled]="isLastQuestionOverall()"
   * ```
   */
  isLastQuestionOverall(): boolean {
    if (!this.sections || this.sections.length === 0) return true;
    const lastSectionIdx = this.sections.length - 1;
    if (!this.sections[lastSectionIdx].questions || this.sections[lastSectionIdx].questions.length === 0) return true; // Handle empty last section
    const lastQuestionInSectionIdx = this.sections[lastSectionIdx].questions.length - 1;
    return this.currentSectionIndex === lastSectionIdx && this.currentQuestionInSectionIndex === lastQuestionInSectionIdx;
  }
  
  /**
   * @private
   * @method processSections
   * @description Advanced section processing with comprehensive language translation support.
   * Transforms server data into display-ready format with multi-language capabilities.
   * 
   * @param {any[] | undefined} sectionsFromServer - Raw section data from backend API
   * @returns {PlayerSection[]} Processed sections with enhanced display properties
   * 
   * @example
   * ```typescript
   * const processedSections = this.processSections(serverSections);
   * // Adds: translation support, display text, available languages
   * // Handles: option formatting, language detection, fallbacks
   * ```
   */
  private processSections(sectionsFromServer: any[] | undefined): PlayerSection[] {
    if (!sectionsFromServer) return [];
    
    console.log('Processing sections from server:', sectionsFromServer);
    
    return sectionsFromServer.map((section, index) => {
      console.log(`Processing section ${index}:`, section);
      console.log(`Section questions (${section.questions?.length || 0}):`, section.questions);
      
      const processedSection = {
        title: section.title,
        order: section.order,
        questions: (section.questions || []).map((originalQuestion: any): PlayerQuestion => {
          console.log(`Processing question:`, originalQuestion);
          
          const backendTranslations: QuestionTranslation[] = originalQuestion.translations || [];
          const availableLanguages = backendTranslations.length > 0 
            ? backendTranslations.map((t: QuestionTranslation) => t.lang) 
            : [this.defaultLanguage];

          const { questionText: displayQuestionText, options: displayOptions, langUsed } = 
              this.getTranslatedContentForQuestion(backendTranslations, this.currentLanguage, originalQuestion.questionText, originalQuestion.options);

          return {
            question: originalQuestion.question, // ID
            translations: backendTranslations.map((bt: QuestionTranslation): QuestionTranslation => ({
                lang: bt.lang,
                questionText: bt.questionText,
                images: bt.images,
                options: (bt.options || []).map((o: QuestionOption): QuestionOption => ({
                    text: o.text,
                    img: o.img,
                    isCorrect: o.isCorrect,
                    _id: o._id
                }))
            })),
            marks: originalQuestion.marks,
            type: originalQuestion.type,
            difficulty: originalQuestion.difficulty,
            questionHistory: originalQuestion.questionHistory || [],
            
            displayQuestionText: displayQuestionText,
            displayOptions: displayOptions,
            availableLanguages: availableLanguages,
            originalLanguageForDisplay: langUsed as 'en' | 'hi',
          };
        })
      };
      
      console.log(`Processed section ${index} has ${processedSection.questions.length} questions`);
      return processedSection;
    });
  }
  /**
   * @private
   * @method getTranslatedContentForQuestion
   * @description Retrieves translated question content with intelligent fallback logic.
   * Handles missing translations gracefully and maintains content consistency.
   * 
   * @param {QuestionTranslation[]} translations - Available translations for the question
   * @param {'en' | 'hi'} preferredLang - User's preferred language
   * @param {string} defaultQuestionText - Fallback question text if no translation found
   * @param {QuestionOption[]} defaultOptions - Fallback options if no translation found
   * @returns {Object} Object containing translated content and language used
   * @returns {string} returns.questionText - Translated or fallback question text
   * @returns {QuestionOption[]} returns.options - Translated or fallback options
   * @returns {string} returns.langUsed - Actual language used for content
   * 
   * @example
   * ```typescript
   * const content = this.getTranslatedContentForQuestion(
   *   question.translations, 'hi', 'Default text', []
   * );
   * console.log(content.questionText); // Hindi text or fallback
   * console.log(content.langUsed); // 'hi', 'en', or other available language
   * ```
   */
  private getTranslatedContentForQuestion(
    translations: QuestionTranslation[], 
    preferredLang: 'en' | 'hi', 
    defaultQuestionText: string = 'Question text not available',
    defaultOptions: QuestionOption[] = []
  ): { questionText: string; options: QuestionOption[]; langUsed: string } {
    let langToUse = preferredLang;
    let translation = translations.find(t => t.lang === langToUse);

    if (!translation) {
      langToUse = this.defaultLanguage;
      translation = translations.find(t => t.lang === langToUse);
    }

    if (!translation && translations.length > 0) {
      translation = translations[0];
      langToUse = translation.lang;
    }

    return {
      questionText: translation?.questionText || defaultQuestionText,
      options: (translation?.options || defaultOptions).map(opt => ({...opt})), // Ensure options are new objects
      langUsed: langToUse
    };
  }

  /**
   * @method changeLanguage
   * @description Dynamically switches the examination interface language and updates all question content.
   * Provides real-time language switching without losing user progress.
   * 
   * @param {'en' | 'hi'} lang - Target language code ('en' for English, 'hi' for Hindi)
   * 
   * @example
   * ```typescript
   * // Switch to Hindi
   * this.changeLanguage('hi');
   * // Updates: all question text, options, UI elements
   * // Preserves: user answers, time tracking, navigation state
   * 
   * // Switch back to English
   * this.changeLanguage('en');
   * ```
   */
  changeLanguage(lang: 'en' | 'hi'): void {
    if (this.currentLanguage === lang) return;
    this.currentLanguage = lang;
    this.sections.forEach(section => {
      section.questions.forEach(question => {
        const { questionText, options, langUsed } = this.getTranslatedContentForQuestion(question.translations, lang, question.displayQuestionText, question.displayOptions);
        question.displayQuestionText = questionText;
        question.displayOptions = options;
        question.originalLanguageForDisplay = langUsed;
      });
    });
    this.cd.detectChanges();
  }

  /**
   * @getter currentQuestionDisplayData
   * @description Retrieves the currently viewed question's display data including translations.
   * Essential for template rendering and question content display.
   * 
   * @returns {PlayerQuestion | undefined} Current question data or undefined if not available
   * 
   * @example
   * ```typescript
   * const currentQ = this.currentQuestionDisplayData;
   * if (currentQ) {
   *   console.log(currentQ.displayQuestionText); // Current question text
   *   console.log(currentQ.displayOptions); // Current answer options
   * }
   * ```
   */
  get currentQuestionDisplayData(): PlayerQuestion | undefined {
    const currentSection = this.sections[this.currentSectionIndex];
    if (currentSection && currentSection.questions && currentSection.questions.length > this.currentQuestionInSectionIndex) {
      const questionData = currentSection.questions[this.currentQuestionInSectionIndex]; // Corrected typo here
      return questionData;
    }
    return undefined;
  }

  /**
   * @method getQuestionStatus
   * @description Determines the visual status of a question for the question palette display.
   * Implements sophisticated status logic based on visit history, answers, and flags.
   * 
   * @param {number} sectionIdx - Section index of the question
   * @param {number} questionInSectionIdx - Question index within the section
   * @returns {string} Status string for CSS class binding
   * @returns {'answered'} Question has been answered (green in palette)
   * @returns {'marked-for-review'} Question is flagged but unanswered (yellow in palette)
   * @returns {'unanswered'} Question visited but not answered (gray in palette)
   * @returns {'not-visited'} Question never visited (white in palette)
   * 
   * @example
   * ```typescript
   * const status = this.getQuestionStatus(1, 2);
   * // Used in template: [class]="'status-' + getQuestionStatus(sIdx, qIdx)"
   * // Possible classes: status-answered, status-marked-for-review, etc.
   * ```
   */
  getQuestionStatus(sectionIdx: number, questionInSectionIdx: number): string {
    const globalIndex = this.getGlobalIndex(sectionIdx, questionInSectionIdx);
    const formCtrl = this.responses.at(globalIndex);
    if (!formCtrl) return 'not-visited'; // Should not happen in normal flow

    const visitedAt = formCtrl.get('visitedAt')?.value;
    if (!visitedAt) {
      return 'not-visited'; // If not visited, show as such
    }

    const isFlagged = formCtrl.get('flagged')?.value;
    const selectedValue = formCtrl.get('selected')?.value;
    // An answer is present if selectedValue is not null (as null is used for unanswered)
    const isAnswered = selectedValue !== null;

    if (isFlagged) {
      if (isAnswered) {
        // Flagged AND Answered: Palette item should be green. Flag icon shown by template if condition met.
        return this.QuestionStatus.ANSWERED;
      } else {
        // Flagged AND Unanswered: Palette item should be yellow. Flag icon not shown by template due to new condition.
        return this.QuestionStatus.MARKED_FOR_REVIEW;
      }
    } else {
      // Not Flagged
      if (isAnswered) {
        return this.QuestionStatus.ANSWERED; // Green
      } else {
        return this.QuestionStatus.UNANSWERED; // Default (e.g., grey/white)
      }
    }
  }
  /**
   * @private
   * @method saveProgressInternal
   * @description Internal progress saving mechanism with manual/automatic trigger distinction.
   * Handles comprehensive state preservation including responses, timing, and metadata.
   * 
   * @param {boolean} isManualTrigger - Whether save was triggered manually by user (default: false)
   * 
   * @example
   * ```typescript
   * // Automatic save (no user notification)
   * this.saveProgressInternal(false);
   * 
   * // Manual save (shows success alert)
   * this.saveProgressInternal(true);
   * 
   * // Saves: all responses, current time left, visit timestamps
   * ```
   */
  private saveProgressInternal(isManualTrigger: boolean = false): void {
    if (!this.attemptId) return;
    this.updateQuestionTimeSpent(this.currentGlobalQuestionIndex);
    // It's important to track visit/lastModifiedAt on any save, not just manual.
    // Let's ensure the current question's state is updated before saving.
    const formCtrl = this.responses.at(this.currentGlobalQuestionIndex) as FormGroup;
    if (formCtrl) {
      if (!formCtrl.get('visitedAt')?.value) {
        formCtrl.get('visitedAt')?.setValue(new Date().toISOString());
      }
      formCtrl.get('lastModifiedAt')?.setValue(new Date().toISOString());
    }

    const payload = this.responses.controls.map(ctrl => ctrl.value);
    
    // Log the payload being sent to the backend, especially for debugging selected answers
    // console.log('[saveProgressInternal] Payload to be sent:', JSON.stringify(payload, null, 2));

    this.testSvc.saveProgress(this.attemptId, { responses: payload, timeLeft: this.timeLeft }).subscribe({
      next: () => {
        console.log(`Progress saved (Trigger: ${isManualTrigger ? 'Manual' : 'Auto'})`);
        if (isManualTrigger) {
          alert('Progress Saved!'); // Only show alert for manual trigger
        }
      },
      error: (err) => console.error('Failed to save progress:', err)
    });
  }
  /**
   * @method triggerManualSave
   * @description Public method for manual progress saving triggered by user action.
   * Provides user feedback through success notification.
   * 
   * @example
   * ```typescript
   * // Called from template button click
   * <button (click)="triggerManualSave()">Save Progress</button>
   * // Shows "Progress Saved!" alert on success
   * ```
   */
  public triggerManualSave(): void {
    this.saveProgressInternal(true); // Call internal save, indicating it's a manual trigger
  }

  /**
   * @private
   * @method trackQuestionVisit
   * @description Records question visit analytics including timestamps and attempt counts.
   * Essential for detailed examination analytics and behavior tracking.
   * 
   * @param {number} globalIndex - Global index of the visited question
   * 
   * @example
   * ```typescript
   * // Called automatically during navigation
   * this.trackQuestionVisit(5);
   * // Records: visit start time, increments attempt count
   * // Updates: visitedAt timestamp if first visit
   * ```
   */
  private trackQuestionVisit(globalIndex: number): void {
    this.questionStartTimes.set(globalIndex, new Date());

    const formCtrl = this.responses.at(globalIndex) as FormGroup;
    if (formCtrl) {
      const currentAttempts = formCtrl.get('attempts')?.value || 0;
      formCtrl.get('attempts')?.setValue(currentAttempts + 1);

      if (!formCtrl.get('visitedAt')?.value) {
        formCtrl.get('visitedAt')?.setValue(new Date().toISOString());
      }
    }
  }

  /**
   * @private
   * @method updateQuestionTimeSpent
   * @description Calculates and updates time spent on a specific question.
   * Implements precise time tracking with minimum threshold to avoid noise.
   * 
   * @param {number} globalIndex - Global index of the question to update
   * 
   * @example
   * ```typescript
   * // Called when leaving a question
   * this.updateQuestionTimeSpent(currentIndex);
   * // Calculates: time since trackQuestionVisit was called
   * // Updates: cumulative timeSpent, lastModifiedAt timestamp
   * // Threshold: Only records time >= 500ms to filter out quick navigation
   * ```
   */
  private updateQuestionTimeSpent(globalIndex: number): void {
    const formCtrl = this.responses.at(globalIndex) as FormGroup;
    if (formCtrl) {
      const startTimeOfThisVisit = this.questionStartTimes.get(globalIndex);
      if (startTimeOfThisVisit) {
        const endTimeOfThisVisit = new Date();
        const durationOfThisVisitMs = endTimeOfThisVisit.getTime() - startTimeOfThisVisit.getTime();

        if (durationOfThisVisitMs >= 500) {
          const durationOfThisVisitSeconds = Math.round(durationOfThisVisitMs / 1000);
          
          if (durationOfThisVisitSeconds > 0) {
            const previouslyAccumulatedTime = formCtrl.get('timeSpent')?.value || 0;
            formCtrl.get('timeSpent')?.setValue(previouslyAccumulatedTime + durationOfThisVisitSeconds);
            formCtrl.get('lastModifiedAt')?.setValue(new Date().toISOString());
          }
        }
        this.questionStartTimes.delete(globalIndex);
      }
    }
  }

  /**
   * @private
   * @method trackAnswerChange
   * @description Records timestamp when user modifies their answer to a question.
   * Used for detailed analytics and audit trail of user interactions.
   * 
   * @param {number} globalIndex - Global index of the modified question
   * 
   * @example
   * ```typescript
   * // Called automatically when answer selection changes
   * this.trackAnswerChange(3);
   * // Updates: lastModifiedAt with current timestamp
   * ```
   */
  private trackAnswerChange(globalIndex: number): void {
    const formCtrl = this.responses.at(globalIndex) as FormGroup;
    if (formCtrl) {
      formCtrl.get('lastModifiedAt')?.setValue(new Date().toISOString());
    }
  }

  /**
   * @method toggleQuestionFlag
   * @description Toggles the review flag status for a specific question.
   * Allows users to mark questions for later review during examination.
   * 
   * @param {number} globalIndex - Global index of the question to flag/unflag
   * 
   * @example
   * ```typescript
   * // Called from template flag button
   * <button (click)="toggleQuestionFlag(currentGlobalQuestionIndex)">
   *   Flag for Review
   * </button>
   * // Toggles: flagged status, updates lastModifiedAt
   * // Triggers: change detection for UI updates
   * ```
   */
  toggleQuestionFlag(globalIndex: number): void {
    const formCtrl = this.responses.at(globalIndex) as FormGroup;
    if (formCtrl) {
      const currentFlagged = formCtrl.get('flagged')?.value || false;
      formCtrl.get('flagged')?.setValue(!currentFlagged);
      formCtrl.get('lastModifiedAt')?.setValue(new Date().toISOString());
      this.cd.detectChanges(); 
    }
  }
    /**
   * @method markForReview
   * @description Marks the current question for review by setting the flagged status.
   */
  markForReview(): void {
    if (this.currentGlobalQuestionIndex >= 0) {
      this.toggleQuestionFlag(this.currentGlobalQuestionIndex);
    }
  }
  
  /**
   * @method clearResponse
   * @description Clears the response for the current question.
   */
  clearResponse(): void {
    if (this.currentGlobalQuestionIndex >= 0) {
      const formCtrl = this.responses.at(this.currentGlobalQuestionIndex) as FormGroup;
      if (formCtrl) {
        formCtrl.get('selected')?.setValue(null);
        formCtrl.get('lastModifiedAt')?.setValue(new Date().toISOString());
        this.cd.detectChanges();
      }
    }
  }

  /**
   * @method toggleSidebar
   * @description Toggles the visibility of the sidebar on mobile devices.
   * Provides space-saving navigation for smaller screens.
   * 
   * @example
   * ```typescript
   * this.toggleSidebar();
   * // Toggles: isSidebarVisible property for mobile view management
   * ```
   */
  toggleSidebar(): void {
    this.isSidebarVisible = !this.isSidebarVisible;
  }

  /**
   * @method ngOnDestroy
   * @description Component cleanup lifecycle hook. Properly cleans up resources,
   * stops timers, and prevents memory leaks.
   */
  ngOnDestroy(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * @private
   * @method checkForChanges
   * @description Compares current form state with last saved state to detect changes.
   * Used to prevent unnecessary save operations and track unsaved changes.
   */
  private checkForChanges(): void {
    const currentState = JSON.stringify(this.form.value);
    this.hasUnsavedChanges = currentState !== this.lastSavedState;
  }

  /**
   * @private
   * @method autoSaveProgress
   * @description Enhanced auto-save method with status tracking and user feedback.
   * Replaces the old manual save system with intelligent automatic saving.
   * 
   * @param {string} trigger - The trigger that initiated this save operation
   */
  private autoSaveProgress(trigger: string): void {
    if (!this.attemptId || this.isAutoSaving) return;
    
    this.isAutoSaving = true;
    this.autoSaveStatus = 'Saving...';
    this.updateQuestionTimeSpent(this.currentGlobalQuestionIndex);
    
    // Update current question's metadata
    const formCtrl = this.responses.at(this.currentGlobalQuestionIndex) as FormGroup;
    if (formCtrl) {
      if (!formCtrl.get('visitedAt')?.value) {
        formCtrl.get('visitedAt')?.setValue(new Date().toISOString());
      }
      formCtrl.get('lastModifiedAt')?.setValue(new Date().toISOString());
    }

    const payload = this.responses.controls.map(ctrl => ctrl.value);
    
    console.log(`[AutoSave] Triggered by: ${trigger}`, payload.length, 'responses');

    this.testSvc.saveProgress(this.attemptId, { responses: payload, timeLeft: this.timeLeft }).subscribe({
      next: () => {
        this.isAutoSaving = false;
        this.autoSaveStatus = 'Saved';
        this.lastSavedAt = new Date();
        this.lastSavedState = JSON.stringify(this.form.value);
        this.hasUnsavedChanges = false;
        
        console.log(`[AutoSave] Success - Trigger: ${trigger}`);
        
        // Clear status message after 2 seconds
        setTimeout(() => {
          this.autoSaveStatus = '';
          this.cd.detectChanges();
        }, 2000);
        
        this.cd.detectChanges();
      },
      error: (err) => {
        this.isAutoSaving = false;
        this.autoSaveStatus = 'Save failed - will retry';
        console.error(`[AutoSave] Error - Trigger: ${trigger}`, err);
        
        // Clear error message after 3 seconds
        setTimeout(() => {
          this.autoSaveStatus = '';
          this.cd.detectChanges();
        }, 3000);
        
        this.cd.detectChanges();
      }
    });
  }

  /**
   * @private
   * @method saveProgressSync
   * @description Synchronous progress saving for critical moments like beforeunload.
   * Uses sendBeacon API for reliability during page unload.
   */
  private saveProgressSync(): void {
    if (!this.attemptId) return;
    
    this.updateQuestionTimeSpent(this.currentGlobalQuestionIndex);
    const payload = {
      responses: this.responses.controls.map(ctrl => ctrl.value),
      timeLeft: this.timeLeft
    };
    
    // Use sendBeacon for reliable transmission during page unload
    const url = `/api/test-attempts/${this.attemptId}/progress`;
    const data = JSON.stringify(payload);
    
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, data);
      console.log('[AutoSave] Sync save via sendBeacon');
    } else {
      // Fallback for older browsers
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url, false); // Synchronous request
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(data);
        console.log('[AutoSave] Sync save via XMLHttpRequest');
      } catch (error) {
        console.error('[AutoSave] Sync save failed:', error);
      }
    }
  }

  /**
   * @method onAnswerChange
   * @description Handles immediate response when user selects or changes an answer.
   * Triggers auto-save and updates tracking metadata.
   * 
   * @example
   * ```typescript
   * // Called automatically when radio button selection changes
   * this.onAnswerChange();
   * // Updates: lastModifiedAt timestamp, triggers change detection
   * ```
   */
  onAnswerChange(): void {
    // Track the answer change with timestamp
    this.trackAnswerChange(this.currentGlobalQuestionIndex);
    
    // Mark that we have unsaved changes
    this.hasUnsavedChanges = true;
    
    // Trigger change detection for reactive form
    this.cd.detectChanges();
    
    console.log('[AutoSave] Answer changed for question', this.currentGlobalQuestionIndex);
  }
}