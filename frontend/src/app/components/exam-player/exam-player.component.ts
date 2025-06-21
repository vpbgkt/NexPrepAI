/**
 * @fileoverview Exam Player Component for NexPrepAI Frontend Application
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
 * @author NexPrepAI Development Team
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
import { MathDisplayComponent } from '../math-display/math-display.component';
import { AntiCheatingService, AntiCheatingMonitor, CheatingEvent, StrictModeInfo } from '../../services/anti-cheating.service';

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
  /** Numerical answer configuration for NAT questions */
  numericalAnswer?: NumericalAnswer;
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
 * @interface NumericalAnswer
 * @description Numerical answer configuration for NAT questions
 */
interface NumericalAnswer {
  /** Minimum accepted value for range-based answers */
  minValue?: number;
  /** Maximum accepted value for range-based answers */
  maxValue?: number;
  /** Exact value for exact match answers */
  exactValue?: number;
  /** Tolerance percentage for approximate answers */
  tolerance?: number;
  /** Optional unit like "m", "kg", etc. */
  unit?: string;
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
  /** Question type: 'single', 'multiple', 'integer', 'numerical', 'matrix' */
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
  /** Numerical answer configuration for NAT questions */
  numericalAnswer?: NumericalAnswer;
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
    imports: [CommonModule, ReactiveFormsModule, MathDisplayComponent],
    templateUrl: './exam-player.component.html',
    styles: [`
      .fullscreen-exam {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 9999 !important;
        background: #f9fafb !important;
      }
      
      .exam-interface {
        width: 100% !important;
        height: 100% !important;
        overflow: hidden !important;
      }
      
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      
      ::ng-deep body.strict-mode {
        overflow: hidden !important;
      }
      
      ::ng-deep .nav-header {
        display: none !important;
      }
        /* Ensure modals always appear above everything else */
      ::ng-deep .modal-overlay {
        z-index: 99999 !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
      }
      
      /* Reduce sidebar z-index and add dimming when modal is open */
      ::ng-deep .sidebar-container.faded {
        z-index: 1 !important;
        position: relative !important;
      }
      
      /* Add overlay effect for better visual separation */
      .modal-active::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        z-index: 9998;
        pointer-events: none;
      }
    `]
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
  hasUnsavedChanges = false;  /** @property {string} JSON string of last saved form state for comparison */
  private lastSavedState = '';

  // Anti-Cheating Properties
  /** @property {boolean} Whether strict mode is enabled for this test */
  isStrictMode = false;
  /** @property {AntiCheatingMonitor|null} Anti-cheating monitor instance */
  private antiCheatingMonitor: AntiCheatingMonitor | null = null;
  /** @property {number} Current cheating violation count */
  cheatingCount = 0;
  /** @property {number} Maximum allowed cheating violations before test termination */
  maxCheatingAttempts = 3;
  /** @property {boolean} Whether to show cheating warning modal */
  showCheatingWarning = false;
  /** @property {string} Current cheating warning message */
  cheatingWarningMessage = '';
  /** @property {CheatingEvent[]} Recent cheating events for display */
  recentCheatingEvents: CheatingEvent[] = [];
  /** @property {boolean} Whether strict mode info modal is visible */
  showStrictModeInfo = false;

  /**
   * @constructor
   * @description Initializes the ExamPlayerComponent with required dependencies and form setup
   * @param {FormBuilder} fb - Angular FormBuilder for reactive forms
   * @param {ActivatedRoute} route - Angular ActivatedRoute for parameter extraction
   * @param {Router} router - Angular Router for navigation
   * @param {TestService} testSvc - Test service for API operations
   * @param {ChangeDetectorRef} cd - Angular ChangeDetectorRef for manual change detection
   * @param {AntiCheatingService} antiCheatingService - Anti-cheating service for strict mode monitoring
   */
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private testSvc: TestService,
    private cd: ChangeDetectorRef,
    private antiCheatingService: AntiCheatingService
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
   */  resumeTest(): void {
    if (this.pendingAttemptId && this.pendingSections.length > 0) {
      console.log('Resuming test with ID:', this.pendingAttemptId);
      this.attemptId = this.pendingAttemptId;
      // pendingTimeLeft is already in seconds, so pass it directly for duration calculation in buildFormAndTimer
      this.buildFormAndTimer(this.pendingTimeLeft, this.pendingSections, this.pendingSavedResponses);
      this.hasSavedProgress = false;
      
      // Initialize anti-cheating if in strict mode
      this.initializeAntiCheating();
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
   */  private startNewTest() {
    this.testSvc.startTest(this.seriesId).subscribe({
      next: (res: StartTestResponse) => {
        console.log('New test started successfully:', res);
        this.attemptId = res.attemptId;
        this.testSeriesTitle = (res as any).seriesTitle || 'Test'; // Use seriesTitle from response
        this.buildFormAndTimer((res as any).duration * 60, res.sections || [], []);
        
        // Initialize anti-cheating if in strict mode
        this.initializeAntiCheating();
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
        }        let selectedValueToSetInForm: any = null;
        let numericalValueToSetInForm: any = null;
        
        if (savedResponse && savedResponse.selected) {
          selectedValueToSetInForm = savedResponse.selected;
        }
          if (savedResponse && savedResponse.numericalAnswer !== undefined) {
          numericalValueToSetInForm = savedResponse.numericalAnswer;
        }// Determine the appropriate form control value based on question type
        let finalSelectedValue: any = null;
        let finalNumericalValue: any = null;

        const questionType = question.type || 'single'; // Default to single choice

        if (questionType === 'multiple') {
          // MSQ: selected should be an array of option indices
          finalSelectedValue = Array.isArray(selectedValueToSetInForm) ? selectedValueToSetInForm : [];
        } else if (questionType === 'integer' || questionType === 'numerical') {
          // NAT: numericalAnswer should be a number
          finalNumericalValue = numericalValueToSetInForm;
          finalSelectedValue = null; // No options for NAT
        } else {
          // Single choice: selected should be a single value
          finalSelectedValue = Array.isArray(selectedValueToSetInForm) && selectedValueToSetInForm.length > 0 
            ? selectedValueToSetInForm[0] 
            : selectedValueToSetInForm;
        }

        responsesArray.push(this.fb.group({
          question: [questionId], // Store the actual question ID
          questionInstanceKey: [questionInstanceKey], // Store the unique key for this instance
          selected: [finalSelectedValue], // Varies by question type
          numericalAnswer: [finalNumericalValue], // For NAT questions
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
      }      this.currentSectionIndex = sectionIdx;      this.currentQuestionInSectionIndex = questionInSectionIdx;
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
    }    if (this.currentQuestionInSectionIndex < this.sections[this.currentSectionIndex].questions.length - 1) {
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
    }    if (this.currentQuestionInSectionIndex > 0) {
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
  get currentQuestionDisplayData(): PlayerQuestion | undefined {    const currentSection = this.sections[this.currentSectionIndex];    if (currentSection && currentSection.questions && currentSection.questions.length > this.currentQuestionInSectionIndex) {
      const questionData = currentSection.questions[this.currentQuestionInSectionIndex]; // Corrected typo here
      return questionData;
    }
    return undefined;
  }

  /**
   * @getter isAnyModalOpen
   * @description Checks if any modal is currently open
   */
  get isAnyModalOpen(): boolean {
    return this.showStrictModeInfo || this.showCheatingWarning;
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
   */  getQuestionStatus(sectionIdx: number, questionInSectionIdx: number): string {
    const globalIndex = this.getGlobalIndex(sectionIdx, questionInSectionIdx);
    const formCtrl = this.responses.at(globalIndex);
    if (!formCtrl) return 'not-visited'; // Should not happen in normal flow

    const visitedAt = formCtrl.get('visitedAt')?.value;
    if (!visitedAt) {
      return 'not-visited'; // If not visited, show as such
    }

    const isFlagged = formCtrl.get('flagged')?.value;
    const selectedValue = formCtrl.get('selected')?.value;
    const numericalValue = formCtrl.get('numericalAnswer')?.value;
    
    // Determine if question is answered based on type
    let isAnswered = false;
    
    // Get the question to determine its type
    const section = this.sections[sectionIdx];
    const question = section?.questions[questionInSectionIdx];
    const questionType = question?.type || 'single';
    
    if (questionType === 'multiple') {
      // MSQ: answered if at least one option is selected
      isAnswered = Array.isArray(selectedValue) && selectedValue.length > 0;
    } else if (questionType === 'integer' || questionType === 'numerical') {
      // NAT: answered if numerical value is provided
      isAnswered = numericalValue !== null && numericalValue !== undefined && numericalValue !== '';
    } else {
      // Single choice: answered if selected value is not null
      isAnswered = selectedValue !== null && selectedValue !== undefined;
    }

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
        const questionType = this.getCurrentQuestionType();
        
        if (questionType === 'multiple') {
          // Clear MSQ selections (set to empty array)
          formCtrl.get('selected')?.setValue([]);
        } else if (questionType === 'integer' || questionType === 'numerical') {
          // Clear NAT numerical answer
          formCtrl.get('numericalAnswer')?.setValue(null);
          formCtrl.get('selected')?.setValue(null);
        } else {
          // Clear single choice selection
          formCtrl.get('selected')?.setValue(null);
        }
        
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
   */  ngOnDestroy(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
    }
    
    // Cleanup anti-cheating monitor
    if (this.antiCheatingMonitor) {
      this.antiCheatingMonitor.cleanup();
    }
    
    // Remove strict mode styles when leaving exam
    if (this.isStrictMode) {
      this.removeStrictModeStyles();
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
  }  /**
   * @method onMSQChange
   * @description Handles multiple select question answer changes
   * @param optionIndex - Index of the option that was checked/unchecked
   * @param event - The change event from the checkbox
   */
  onMSQChange(optionIndex: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const isChecked = target.checked;
    const formCtrl = this.responses.at(this.currentGlobalQuestionIndex) as FormGroup;
    const currentSelected = formCtrl.get('selected')?.value || [];
    
    let newSelected = [...currentSelected];
    
    if (isChecked) {
      // Add the option if not already present
      if (!newSelected.includes(optionIndex)) {
        newSelected.push(optionIndex);
      }
    } else {
      // Remove the option
      newSelected = newSelected.filter(idx => idx !== optionIndex);
    }
    
    formCtrl.get('selected')?.setValue(newSelected);
    this.onAnswerChange();
  }  /**
   * @method onNATChange
   * @description Handles numerical answer type question input changes
   * @param event - The input event from the numerical input field
   */  onNATChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    const formCtrl = this.responses.at(this.currentGlobalQuestionIndex) as FormGroup;
    const numValue = value ? parseFloat(value) : null;
    
    console.log(`[NAT_DEBUG_FRONTEND] Input value: "${value}", parsed: ${numValue}, type: ${typeof numValue}`);
    
    formCtrl.get('numericalAnswer')?.setValue(numValue);
    formCtrl.get('selected')?.setValue(null); // Clear selected for NAT questions
    this.onAnswerChange();
  }

  /**
   * @method isMSQOptionSelected
   * @description Checks if an MSQ option is currently selected
   * @param optionIndex - Index of the option to check
   * @returns Whether the option is selected
   */
  isMSQOptionSelected(optionIndex: number): boolean {
    const formCtrl = this.responses.at(this.currentGlobalQuestionIndex) as FormGroup;
    const selected = formCtrl.get('selected')?.value || [];
    return Array.isArray(selected) && selected.includes(optionIndex);
  }
  /**
   * @method getNumericalAnswer
   * @description Gets the current numerical answer value for NAT questions
   * @returns The current numerical answer or empty string
   */
  getNumericalAnswer(): string {
    const formCtrl = this.responses.at(this.currentGlobalQuestionIndex) as FormGroup;
    const value = formCtrl.get('numericalAnswer')?.value;
    return value !== null && value !== undefined ? value.toString() : '';
  }

  /**
   * @method getCurrentQuestionType
   * @description Gets the type of the current question
   * @returns The question type or 'single' as default
   */
  getCurrentQuestionType(): string {
    return this.currentQuestionDisplayData?.type || 'single';
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
  /**
   * @method getProgressStats
   * @description Calculates exam progress statistics including attempted questions
   * @returns Object with attempted and total question counts
   */
  getProgressStats(): { attempted: number; total: number } {
    if (!this.sections || this.sections.length === 0) {
      return { attempted: 0, total: 0 };
    }

    let attempted = 0;
    let total = 0;

    try {
      this.sections.forEach((section, sectionIdx) => {
        if (section && section.questions) {
          section.questions.forEach((question, questionIdx) => {
            total++;
            const globalIdx = this.getGlobalIndex(sectionIdx, questionIdx);
            
            if (globalIdx < this.responses.length) {
              const formCtrl = this.responses.at(globalIdx) as FormGroup;
              
              if (formCtrl) {
                const questionType = question.type || 'single';
                let isAttempted = false;

                if (questionType === 'integer' || questionType === 'numerical') {
                  // For NAT questions, check numericalAnswer
                  const numericalAnswer = formCtrl.get('numericalAnswer')?.value;
                  isAttempted = numericalAnswer !== null && numericalAnswer !== undefined && numericalAnswer !== '';
                } else {
                  // For MCQ/MSQ questions, check selected
                  const selected = formCtrl.get('selected')?.value;
                  isAttempted = selected !== null && selected !== undefined && 
                               ((Array.isArray(selected) && selected.length > 0) || 
                                (!Array.isArray(selected) && selected !== ''));
                }

                if (isAttempted) {
                  attempted++;
                }
              }
            }
          });
        }
      });
    } catch (error) {
      console.error('Error calculating progress stats:', error);
      return { attempted: 0, total: 0 };
    }

    console.log(`Progress Stats: ${attempted}/${total} attempted`);
    return { attempted, total };
  }
  /**
   * @method getTotalQuestions
   * @description Gets the total number of questions across all sections
   * @returns Total number of questions
   */
  getTotalQuestions(): number {
    if (!this.sections || this.sections.length === 0) {
      return 0;
    }
    return this.sections.reduce((total, section) => total + section.questions.length, 0);
  }

  // ========================================
  // Anti-Cheating Methods
  // ========================================
  /**
   * @private
   * @method initializeAntiCheating
   * @description Initializes anti-cheating system if the test is in strict mode
   */
  private async initializeAntiCheating(): Promise<void> {
    if (!this.attemptId) {
      console.warn('No attempt ID available for anti-cheating initialization');
      return;
    }

    try {
      // Check if this test series requires strict mode
      const response = await this.antiCheatingService.checkStrictMode(this.seriesId).toPromise();
        if (response && response.success && response.data && response.data.isStrictMode) {
        this.isStrictMode = true;
        this.maxCheatingAttempts = 3; // Default value
        
        console.log('Strict mode enabled for this test');
        
        // Apply strict mode styling to hide navigation
        this.applyStrictModeStyles();
        
        // Show strict mode information to user
        this.showStrictModeInfoModal();
        
        // Initialize the anti-cheating monitor
        this.startAntiCheatingMonitor();
          // Get current cheating stats
        this.loadCheatingStats();
        
        // Start periodic refresh of cheating stats
        this.refreshCheatingStats();
      } else {
        console.log('Test is not in strict mode, anti-cheating disabled');
        this.isStrictMode = false;
      }
    } catch (error) {
      console.error('Error initializing anti-cheating:', error);
      // If there's an error checking strict mode, assume normal mode
      this.isStrictMode = false;
    }
  }
  /**
   * @private
   * @method startAntiCheatingMonitor
   * @description Starts the anti-cheating monitor with event handlers
   */
  private startAntiCheatingMonitor(): void {
    if (!this.attemptId) return;

    console.log('Starting anti-cheating monitor for attempt:', this.attemptId);

    // Create monitor instance with callbacks
    this.antiCheatingMonitor = new AntiCheatingMonitor(
      this.antiCheatingService,
      (event: CheatingEvent, shouldTerminate: boolean) => {
        console.log('Anti-cheating violation callback triggered:', event, shouldTerminate);
        this.handleCheatingEvent(event);
        if (shouldTerminate) {
          this.handleMaxViolationsReached();
        }
      },
      (message: string, count: number) => {
        console.log('Anti-cheating warning callback triggered:', message, count);
        this.cheatingWarningMessage = message;
        this.cheatingCount = count;
        this.showCheatingWarning = true;
      }
    );
    
    // Initialize monitoring
    this.antiCheatingMonitor.initialize(this.attemptId, this.isStrictMode);
    
    console.log('Anti-cheating monitor started successfully');
  }

  /**
   * @private
   * @method handleCheatingEvent
   * @description Handles cheating events detected by the monitor
   * @param event The cheating event
   */
  private handleCheatingEvent(event: CheatingEvent): void {
    if (!this.attemptId) return;
    
    console.warn('Cheating event detected:', event);
    
    // Add context information
    const contextualEvent: CheatingEvent = {
      ...event,
      questionIndex: this.currentGlobalQuestionIndex,
      timeRemaining: this.timeLeft,
      currentSection: this.sections[this.currentSectionIndex]?.title
    };
    
    // Log event to backend
    this.antiCheatingService.logCheatingEvent(this.attemptId, contextualEvent).subscribe({
      next: (response) => {
        console.log('Cheating event logged:', response);
        
        // Update local cheating count from response if available
        if (response.success && response.data) {
                   this.cheatingCount = response.data.totalAttempts || this.cheatingCount + 1;
        } else {
          this.cheatingCount++;
        }
        
        // Add to recent events for display
        this.recentCheatingEvents.unshift(contextualEvent);
        if (this.recentCheatingEvents.length > 5) {
          this.recentCheatingEvents.pop();
        }
        
        // Show warning to user
        this.showCheatingWarningModal(event);
        
        // Check if maximum violations reached
        if (this.cheatingCount >= this.maxCheatingAttempts) {
          this.handleMaxViolationsReached();
        }
      },
      error: (error) => {
        console.error('Error logging cheating event:', error);
        // Still increment count locally
        this.cheatingCount++;
        this.showCheatingWarningModal(event);
      }
    });
  }

  /**
   * @private
   * @method showCheatingWarningModal
   * @description Shows a warning modal for cheating behavior
   * @param event The cheating event that triggered the warning
   */
  private showCheatingWarningModal(event: CheatingEvent): void {    const eventMessages: { [key: string]: string } = {
      'tab-switch': 'Switching to another tab or window is not allowed during the exam.',
      'window-blur': 'The exam window lost focus. Please keep the exam window active.',
      'fullscreen-exit': 'Exiting fullscreen mode is not allowed during the exam. If you want to exit, click on "Finish Exam" or "Submit Exam" button.',
      'copy-attempt': 'Copying content is not allowed during the exam.',
      'paste-attempt': 'Pasting content is not allowed during the exam.',
      'right-click': 'Right-clicking is disabled during the exam.',
      'key-shortcut': 'Keyboard shortcuts are disabled during the exam.',
      'devtools-attempt': 'Developer tools are not allowed during the exam.'
    };
    
    // Normalize event type (convert underscores to hyphens for consistent messaging)
    const normalizedEventType = event.type.replace(/_/g, '-');
    
    this.cheatingWarningMessage = eventMessages[normalizedEventType] || 'Suspicious activity detected.';
    this.cheatingWarningMessage += ` Warning ${this.cheatingCount}/${this.maxCheatingAttempts}. `;
    
    if (this.cheatingCount >= this.maxCheatingAttempts - 1) {
      this.cheatingWarningMessage += 'One more violation will result in automatic test submission.';
    }
    
    this.showCheatingWarning = true;
    
    // Auto-hide warning after 5 seconds
    setTimeout(() => {
      this.showCheatingWarning = false;
    }, 5000);
  }
  /**
   * @private
   * @method handleMaxViolationsReached
   * @description Handles the case when maximum cheating violations are reached
   */
  private handleMaxViolationsReached(): void {
    console.log('Maximum cheating violations reached, terminating exam');
    
    // Stop the anti-cheating monitor
    if (this.antiCheatingMonitor) {
      this.antiCheatingMonitor.cleanup();
    }
    
    // Show final warning
    alert('Maximum cheating violations reached. Your exam will be submitted automatically.');
    
    // Force submit the exam
    this.submit();
  }
  /**
   * @private
   * @method loadCheatingStats
   * @description Loads current cheating statistics for the attempt
   */
  private loadCheatingStats(): void {
    if (!this.attemptId) return;
    
    this.antiCheatingService.getCheatingStats(this.attemptId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.cheatingCount = response.data.totalAttempts || 0;
          this.recentCheatingEvents = response.data.events || [];
          console.log('Loaded cheating stats:', response.data);
          
          // Also update the anti-cheating monitor's violation count
          if (this.antiCheatingMonitor) {
            (this.antiCheatingMonitor as any).violationCount = this.cheatingCount;
          }
        }
      },
      error: (error) => {
        console.error('Error loading cheating stats:', error);
      }
    });
  }

  /**
   * @method refreshCheatingStats
   * @description Manually refresh cheating statistics (called periodically)
   */
  private refreshCheatingStats(): void {
    // Refresh stats every 10 seconds to ensure sync with backend
    setInterval(() => {
      if (this.isStrictMode && this.attemptId) {
        this.loadCheatingStats();
      }
    }, 10000);
  }

  /**
   * @method showStrictModeInfoModal
   * @description Shows information modal about strict mode to the user
   */
  showStrictModeInfoModal(): void {
    this.showStrictModeInfo = true;
  }

  /**
   * @method closeStrictModeInfo
   * @description Closes the strict mode information modal
   */
  closeStrictModeInfo(): void {
    this.showStrictModeInfo = false;
  }

  /**
   * @method closeCheatingWarning
   * @description Closes the cheating warning modal
   */
  closeCheatingWarning(): void {
    this.showCheatingWarning = false;
  }

  /**
   * @private
   * @method applyStrictModeStyles
   * @description Applies strict mode styles to hide navigation and ensure fullscreen
   */
  private applyStrictModeStyles(): void {
    // Add strict mode class to body to hide navigation
    document.body.classList.add('strict-mode');
    
    // Hide any navigation elements
    const navElements = document.querySelectorAll('.nav-header, nav, .navbar, .navigation');
    navElements.forEach(element => {
      (element as HTMLElement).style.display = 'none';
    });
    
    // Ensure body takes full height
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }

  /**
   * @private
   * @method removeStrictModeStyles
   * @description Removes strict mode styles when exam ends
   */
  private removeStrictModeStyles(): void {
    // Remove strict mode class from body
    document.body.classList.remove('strict-mode');
    
    // Restore navigation elements
    const navElements = document.querySelectorAll('.nav-header, nav, .navbar, .navigation');
    navElements.forEach(element => {
      (element as HTMLElement).style.display = '';
    });
    
    // Restore body overflow
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }

  /**
   * @method getCheatingEventIcon
   * @description Gets the appropriate icon for a cheating event type
   * @param eventType The type of cheating event
   * @returns Icon class string
   */
  getCheatingEventIcon(eventType: string): string {
    const iconMap: { [key: string]: string } = {
      'tab_switch': 'material-icons-outlined',
      'window_blur': 'material-icons-outlined',
      'fullscreen_exit': 'material-icons-outlined',
      'copy_attempt': 'material-icons-outlined',
      'paste_attempt': 'material-icons-outlined',
      'right_click': 'material-icons-outlined',
      'keyboard_shortcut': 'material-icons-outlined',
      'devtools_attempt': 'material-icons-outlined'
    };
    
    return iconMap[eventType] || 'material-icons-outlined';
  }
}