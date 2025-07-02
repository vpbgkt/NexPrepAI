/**
 * @fileoverview Build Paper Component for NexPrepAI Admin Panel
 * @description Advanced component for creating and managing test series with comprehensive
 * question selection, section management, and exam configuration capabilities.
 * @module BuildPaperComponent
 * @requires @angular/core
 * @requires @angular/forms
 * @requires @angular/common
 * @requires rxjs
 * @requires TestSeriesService
 * @requires QuestionService
 * @requires ExamFamilyService
 * @requires ExamStreamService
 * @requires ExamPaperService
 * @requires ExamShiftService
 * @author NexPrepAI Development Team
 * @since 1.0.0
 */

import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule, AbstractControl } from '@angular/forms'; // MODIFIED: Added AbstractControl
import { CommonModule } from '@angular/common';
import { Subject, Subscription, combineLatest, merge } from 'rxjs'; // MODIFIED: Added combineLatest, merge
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators'; // MODIFIED: Added map, startWith

import { TestSeriesService, TestSeries } from '../../services/test-series.service';
import { QuestionService } from '../../services/question.service';
import { Question } from '../../models/question.model';

import {
  ExamFamilyService,
  ExamFamily
} from '../../services/exam-family.service';

import {
  ExamLevelService,
  ExamLevel
} from '../../services/exam-level.service';

import {
  ExamBranchService,
  ExamBranch
} from '../../services/exam-branch.service';

import {
  ExamStreamService,
  ExamStream
} from '../../services/exam-stream.service';

import {
  ExamPaperService,
  ExamPaper
} from '../../services/exam-paper.service';

import {
  ExamShiftService,
  ExamShift
} from '../../services/exam-shift.service';
import { HighlightPipe } from '../../pipes/highlight.pipe'; // Assuming pipe is in src/app/pipes
import { NotificationService } from '../../services/notification.service'; // Import NotificationService

/**
 * @class BuildPaperComponent
 * @description Advanced Angular component for creating and managing test series in the NexPrepAI admin panel.
 * Provides comprehensive functionality for:
 * - Creating multi-section test papers with configurable parameters
 * - Advanced question selection with real-time search and filtering
 * - Dynamic section management with independent question pools
 * - Exam hierarchy navigation (Family → Stream → Paper → Shift)
 * - Question preview and validation before test creation
 * - Flexible test modes (practice, exam, mock) with custom settings
 * 
 * @implements {OnInit} Lifecycle hook for component initialization
 * @implements {OnDestroy} Lifecycle hook for cleanup operations
 * 
 * @example
 * ```typescript
 * // Component usage in template
 * <app-build-paper></app-build-paper>
 * 
 * // The component provides a complete interface for:
 * // 1. Test series configuration
 * // 2. Section management
 * // 3. Question selection and search
 * // 4. Preview and validation
 * // 5. Test creation and publishing
 * ```
 */
@Component({
  selector: 'app-build-paper',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HighlightPipe // ADDED: HighlightPipe
  ],
  templateUrl: './build-paper.component.html',
  styleUrls: ['./build-paper.component.scss']
})
export class BuildPaperComponent implements OnInit, OnDestroy, AfterViewInit { // MODIFIED: Implements OnDestroy, AfterViewInit
  /** @property {FormGroup} Main reactive form for test series configuration */
  seriesForm!: FormGroup;
  
  /** @property {Question[]} Complete list of available questions */
  questionsList: Question[] = [];
    /** @property {ExamFamily[]} Available exam families (e.g., JEE, NEET, GATE) */
  families: ExamFamily[] = [];
  
  /** @property {ExamLevel[]} Available levels for selected family */
  levels: ExamLevel[] = [];
  
  /** @property {ExamBranch[]} Available branches for selected level */
  branches: ExamBranch[] = [];
  
  /** @property {ExamStream[]} Available streams for selected branch */
  streams:  ExamStream[] = [];
  
  /** @property {ExamPaper[]} Available papers for selected stream */
  papers:   ExamPaper[] = [];
  
  /** @property {ExamShift[]} Available shifts for selected paper */
  shifts:   ExamShift[] = [];
  
  /** @property {number} Current year for default date selection */
  currentYear: number = new Date().getFullYear();
  /** @property {any[][]} Array of previewed questions for each section */
previewedQuestions: any[][] = [];

  /** @property {string[]} Search terms for each section's question search */
  sectionSearchTerms: string[] = [];
  /** @property {Question[][]} Search results for each section's question search */
  sectionSearchResults: Question[][] = [];

  /** @property {boolean[]} Toggle state for Question Pool Configuration section visibility per section */
  sectionPoolConfigVisible: boolean[] = [];

  /** @property {number[]} Default marks to apply when adding questions from search results per section */
  sectionDefaultSearchMarks: number[] = [];

  /** @property {number[]} Default negative marks to apply when adding questions from search results per section */
  sectionDefaultSearchNegativeMarks: number[] = [];

  /** @private {Subject<string>[]} RxJS subjects for debouncing search input per section */
  private searchDebouncers: Subject<string>[] = []; // MODIFIED: Changed Subject<number> to Subject<string>
  
  /** @private {Subscription[]} Subscriptions for search operations cleanup */
  private searchSubscriptions: Subscription[] = [];
  
  /** @private {Subscription[]} Subscriptions for section interaction cleanup */
  private sectionInteractionSubscriptions: Subscription[] = []; // ADDED

  /**
   * @constructor
   * @description Initializes the BuildPaperComponent with required services
   * @param {FormBuilder} fb - Angular FormBuilder for reactive forms
   * @param {TestSeriesService} tsService - Service for test series operations
   * @param {QuestionService} qService - Service for question management
   * @param {ExamFamilyService} efService - Service for exam family operations
   * @param {ExamStreamService} streamService - Service for exam stream operations
   * @param {ExamPaperService} paperService - Service for exam paper operations
   * @param {ExamShiftService} shiftService - Service for exam shift operations
   */  constructor(
    private fb: FormBuilder,
    private tsService: TestSeriesService,
    private qService: QuestionService,
    private efService: ExamFamilyService,
    private levelService: ExamLevelService,
    private branchService: ExamBranchService,
    private streamService: ExamStreamService,
    private paperService: ExamPaperService,
    private shiftService: ExamShiftService,
    private notificationService: NotificationService
  ) {}

  /**
   * @method getQuestionIdString
   * @description Helper method to extract string ID from Question object or its _id part
   * @param {any} idValue - Question ID value that can be string or object with $oid
   * @returns {string} String representation of the question ID
   * 
   * @example
   * ```typescript
   * // Handle different ID formats
   * const stringId = this.getQuestionIdString(question._id);
   * const objectId = this.getQuestionIdString({$oid: "507f1f77bcf86cd799439011"});
   * ```
   */
  // ADDED: Helper to get string ID from Question object or its _id part
  getQuestionIdString(idValue: any): string {
    if (typeof idValue === 'string') {
      return idValue;
    }
    if (idValue && typeof idValue === 'object' && '$oid' in idValue) {
      return idValue.$oid;
    }
    // Fallback or error handling if needed
    console.warn('[getQuestionIdString] Unexpected ID format:', idValue);
    return String(idValue); 
  }  /**
   * @method ngOnInit
   * @description Angular lifecycle hook for component initialization.
   * Sets up the reactive form, loads initial data, and configures form change listeners
   * for hierarchical dropdown dependencies (family → stream → paper → shift).
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Component initialization flow:
   * // 1. Build reactive form with validation
   * // 2. Load exam families
   * // 3. Set up cascade listeners for dropdowns
   * // 4. Initialize search functionality
   * ```
   */  ngOnInit(): void {
    // Scroll to top of page on component initialization/page refresh
    // Multiple approaches to ensure it works across different browsers and scenarios
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Use setTimeout to ensure it runs after browser's scroll restoration
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 0);
    
    // Rebuilt FormGroup to remove negativeMark and examBody
    this.seriesForm = this.fb.group({
      title:     ['', Validators.required],
      duration:  [60, Validators.required],
      type:      ['Practice_Exam', Validators.required], // MODIFIED: Aligned with backend enum and set a default
      mode:      ['practice', Validators.required], // ADDED: Mode selection
      maxAttempts: [5, [Validators.required, Validators.min(1)]], // ★ ADD
      year:      [this.currentYear, Validators.required],
      startAt:   [null],
      endAt:     [null],
      family:    ['', Validators.required],
      level:     [{value: '', disabled: true}, Validators.required],
      branch:    [{value: '', disabled: true}, Validators.required],
      stream:    [{value: '', disabled: true}, Validators.required],
      paper:     [{value: '', disabled: true}, Validators.required],
      shift:     [{value: '', disabled: true}, Validators.required],
      randomizeSectionOrder: [false], // ADDED: For randomizing section order
      enablePublicLeaderboard: [false], // ADDED: For public leaderboard
      sections:  this.fb.array([])
    });

    // Fetch all families
    this.efService.getAll().subscribe(f => {
      console.log('🗂️ Fetched families:', f);
      this.families = f;
    });    // When family changes, load levels and reset dependent fields
    this.seriesForm.get('family')!.valueChanges.subscribe(familyId => {
      console.log('[BuildPaperComponent] Family selected. ID:', familyId);

      // Reset dependent form controls first
      this.seriesForm.get('level')!.setValue(null, { emitEvent: false });
      this.seriesForm.get('branch')!.setValue(null, { emitEvent: false });
      this.seriesForm.get('stream')!.setValue(null, { emitEvent: false });
      this.seriesForm.get('paper')!.setValue(null, { emitEvent: false });
      this.seriesForm.get('shift')!.setValue(null, { emitEvent: false });
      console.log('[BuildPaperComponent] Dependent form controls (level, branch, stream, paper, shift) reset.');

      // Clear data arrays for dropdown options
      this.levels = [];
      this.branches = [];
      this.streams = [];
      this.papers = [];
      this.shifts = [];
      console.log('[BuildPaperComponent] Dependent data arrays cleared.');
      
      // Ensure the dependent dropdowns are disabled
      this.seriesForm.get('level')?.disable();
      this.seriesForm.get('branch')?.disable();
      this.seriesForm.get('stream')?.disable();
      this.seriesForm.get('paper')?.disable();
      this.seriesForm.get('shift')?.disable();

      if (familyId && String(familyId).trim() !== '') {
        console.log(`[BuildPaperComponent] Fetching levels for familyId: "${familyId}"`);
        this.levelService.getByFamily(familyId).subscribe({
          next: levelsData => {
            console.log('[BuildPaperComponent] Levels data received:', levelsData);
            if (Array.isArray(levelsData)) {
              this.levels = levelsData;
              
              // Enable the level dropdown if levels are available
              if (this.levels.length > 0) {
                this.seriesForm.get('level')?.enable();
              }
            }
          },
          error: err => {
            console.error('[BuildPaperComponent] Error fetching levels:', err);
          }
        });
      }
    });

    // When level changes, load branches and reset dependent fields
    this.seriesForm.get('level')!.valueChanges.subscribe(levelId => {
      console.log('[BuildPaperComponent] Level selected. ID:', levelId);

      // Reset dependent form controls
      this.seriesForm.get('branch')!.setValue(null, { emitEvent: false });
      this.seriesForm.get('stream')!.setValue(null, { emitEvent: false });
      this.seriesForm.get('paper')!.setValue(null, { emitEvent: false });
      this.seriesForm.get('shift')!.setValue(null, { emitEvent: false });

      // Clear data arrays
      this.branches = [];
      this.streams = [];
      this.papers = [];
      this.shifts = [];
      
      // Disable dependent dropdowns
      this.seriesForm.get('branch')?.disable();
      this.seriesForm.get('stream')?.disable();
      this.seriesForm.get('paper')?.disable();
      this.seriesForm.get('shift')?.disable();

      if (levelId && String(levelId).trim() !== '') {
        this.branchService.getByLevel(levelId).subscribe({
          next: branchesData => {
            console.log('[BuildPaperComponent] Branches data received:', branchesData);
            if (Array.isArray(branchesData)) {
              this.branches = branchesData;
              
              // Enable the branch dropdown if branches are available
              if (this.branches.length > 0) {
                this.seriesForm.get('branch')?.enable();
              }
            }
          },
          error: err => {
            console.error('[BuildPaperComponent] Error fetching branches:', err);
          }
        });
      }
    });

    // When branch changes, load streams and reset dependent fields
    this.seriesForm.get('branch')!.valueChanges.subscribe(branchId => {
      console.log('[BuildPaperComponent] Branch selected. ID:', branchId);

      // Reset dependent form controls
      this.seriesForm.get('stream')!.setValue(null, { emitEvent: false });
      this.seriesForm.get('paper')!.setValue(null, { emitEvent: false });
      this.seriesForm.get('shift')!.setValue(null, { emitEvent: false });

      // Clear data arrays
      this.streams = [];
      this.papers = [];
      this.shifts = [];
      
      // Disable dependent dropdowns
      this.seriesForm.get('stream')?.disable();
      this.seriesForm.get('paper')?.disable();
      this.seriesForm.get('shift')?.disable();

      if (branchId && String(branchId).trim() !== '') {
        this.streamService.getByBranch(branchId).subscribe({
          next: streamsData => {
            console.log('[BuildPaperComponent] Streams data received:', streamsData);
            if (Array.isArray(streamsData)) {
              this.streams = streamsData;
              
              // Enable the stream dropdown if streams are available
              if (this.streams.length > 0) {
                this.seriesForm.get('stream')?.enable();
              }
            }
          },
          error: err => {
            console.error('[BuildPaperComponent] Error fetching streams:', err);
          }        });
      }
    });

    // When stream changes, load papers
    this.seriesForm.get('stream')!.valueChanges.subscribe(sid => {
      // Reset dependent form controls
      this.seriesForm.get('paper')!.setValue(null, { emitEvent: false });
      this.seriesForm.get('shift')!.setValue(null, { emitEvent: false });
      
      // Clear current papers and shifts arrays
      this.papers = [];
      this.shifts = [];
      
      // Disable the paper and shift dropdowns by default
      this.seriesForm.get('paper')?.disable();
      this.seriesForm.get('shift')?.disable();
      
      if (sid && String(sid).trim() !== '') {
        console.log(`[BuildPaperComponent] Fetching papers for streamId: "${sid}"`);
        this.paperService.getByStream(sid)
          .subscribe({
            next: papersData => {
              if (Array.isArray(papersData)) {
                this.papers = papersData;
                console.log(`[BuildPaperComponent] Loaded ${this.papers.length} papers for stream ${sid}`);
                
                // Enable the paper dropdown if papers are available
                if (this.papers.length > 0) {
                  this.seriesForm.get('paper')?.enable();
                } 
              } else {
                console.error('[BuildPaperComponent] papersData is not an array:', papersData);
                this.papers = [];
              }
            },
            error: err => {
              console.error('[BuildPaperComponent] Error fetching papers:', err);
              this.papers = [];
            }
          });
      } else {
        console.log('[BuildPaperComponent] streamId is null or empty. Not fetching papers.');
      }
    });    // When paper changes, load shifts
    this.seriesForm.get('paper')!.valueChanges.subscribe(pid => {
      // Reset shift form control
      this.seriesForm.get('shift')!.setValue(null, { emitEvent: false });
      
      // Clear current shifts array
      this.shifts = [];
      
      // Disable the shift dropdown by default
      this.seriesForm.get('shift')?.disable();
      
      if (pid && String(pid).trim() !== '') {
        console.log(`[BuildPaperComponent] Fetching shifts for paperId: "${pid}"`);
        this.shiftService.getByPaper(pid)
          .subscribe({
            next: shiftsData => {
              if (Array.isArray(shiftsData)) {
                this.shifts = shiftsData;
                console.log(`[BuildPaperComponent] Loaded ${this.shifts.length} shifts for paper ${pid}`);
                
                // Enable the shift dropdown if shifts are available
                if (this.shifts.length > 0) {
                  this.seriesForm.get('shift')?.enable();
                }
              } else {
                console.error('[BuildPaperComponent] shiftsData is not an array:', shiftsData);
                this.shifts = [];
              }
            },
            error: err => {
              console.error('[BuildPaperComponent] Error fetching shifts:', err);
              this.shifts = [];
            }
          });
      } else {
        console.log('[BuildPaperComponent] paperId is null or empty. Not fetching shifts.');
      }
    });    
    
    // Load question bank with pagination (load first 100 questions initially)
    this.qService.getAll(1, 100).subscribe({
      next: (response) => {
        this.questionsList = response.questions;
        console.log('[BuildPaperComponent] Loaded questions:', response.questions.length);
        console.log('[BuildPaperComponent] Total questions available:', response.pagination.totalCount);
      },
      error: (error) => {
        console.error('[BuildPaperComponent] Error loading questions:', error);
        this.questionsList = [];
      }
    });

    // Handle mode changes to dynamically update validators for startAt and endAt
    this.seriesForm.get('mode')!.valueChanges.subscribe(mode => {
      const startAtControl = this.seriesForm.get('startAt');
      const endAtControl = this.seriesForm.get('endAt');
      
      if (mode === 'live') {
        // Make startAt and endAt required for live mode
        startAtControl?.setValidators([Validators.required]);
        endAtControl?.setValidators([Validators.required]);
      } else {
        // Remove required validation for practice mode
        startAtControl?.clearValidators();
        endAtControl?.clearValidators();
      }
      
      // Update validity status
      startAtControl?.updateValueAndValidity();
      endAtControl?.updateValueAndValidity();
    });

    // Debounce search input
    // MODIFIED: setupSearchDebouncer and setupSectionInteractionLogic will be called in addSection
    // this.sections.controls.forEach((_, index) => this.setupSearchDebouncer(index));
  }

  /**
   * @method ngOnDestroy
   * @description Angular lifecycle hook for component cleanup.
   * Unsubscribes from all RxJS subscriptions and completes subjects to prevent memory leaks.
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Cleanup operations performed:
   * // 1. Unsubscribe search subscriptions
   * // 2. Complete search debouncer subjects
   * // 3. Unsubscribe section interaction listeners
   * ```
   */  ngOnDestroy(): void {
    this.searchSubscriptions.forEach(sub => {
      if (sub) sub.unsubscribe();
    });
    this.searchSubscriptions = []; // Clear the array

    this.searchDebouncers.forEach(debouncer => {
      if (debouncer) debouncer.complete();
    });
    this.searchDebouncers = []; // Clear the array

    this.sectionInteractionSubscriptions.forEach(sub => { // ADDED: Cleanup for interaction subscriptions
      if (sub) sub.unsubscribe();
    });
    this.sectionInteractionSubscriptions = [];
  }

  /**
   * @method ngAfterViewInit
   * @description Angular lifecycle hook called after view initialization.
   * Ensures scroll to top happens after the view is fully rendered.
   * 
   * @returns {void}
   */
  ngAfterViewInit(): void {
    // Additional scroll to top after view is initialized
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, 100);
  }

  /**
   * @private
   * @method setupSearchDebouncer
   * @description Sets up debounced search functionality for a specific section.
   * Cleans up existing subscriptions and creates new RxJS subject with debounce for real-time search.
   * 
   * @param {number} secIndex - Index of the section to set up search debouncing for
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Called when new section is added
   * this.setupSearchDebouncer(2); // Set up search for section index 2
   * 
   * // Creates debounced search with 350ms delay
   * // Triggers performSearch when user stops typing
   * ```
   */
  private setupSearchDebouncer(secIndex: number): void {
    // Clean up existing debouncer and subscription if any for this index
    if (this.searchSubscriptions[secIndex]) {
      this.searchSubscriptions[secIndex].unsubscribe();
    }
    if (this.searchDebouncers[secIndex]) {
      this.searchDebouncers[secIndex].complete();
    }

    this.searchDebouncers[secIndex] = new Subject<string>();
    this.searchSubscriptions[secIndex] = this.searchDebouncers[secIndex].pipe(
      debounceTime(350),       // Debounce time in ms
      distinctUntilChanged()   // Only emit if value has changed
    ).subscribe(() => {
      // The search term is already updated in this.sectionSearchTerms[secIndex] via ngModel
      this.performSearch(secIndex);
    });
  }

  /**
   * @private
   * @method setupSectionInteractionLogic
   * @description Sets up reactive form logic to handle mutual exclusivity between question pool mode
   * and manual question selection within a section. Ensures only one method can be active at a time.
   * 
   * @param {number} secIndex - Index of the section to set up interaction logic for
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Called when new section is added
   * this.setupSectionInteractionLogic(1);
   * 
   * // Behavior:
   * // - When pool is active → disable manual questions
   * // - When manual questions added → disable pool controls
   * // - Prevents conflicts between selection methods
   * ```
   */
  private setupSectionInteractionLogic(secIndex: number): void {
    const sectionGroup = this.sections.at(secIndex) as FormGroup;
    const poolCtrl = sectionGroup.get('questionPool')!;
    const numToSelectCtrl = sectionGroup.get('questionsToSelectFromPool')!;
    const manualQuestionsArr = sectionGroup.get('questions') as FormArray;

    const interactionSub = new Subscription();
    this.sectionInteractionSubscriptions[secIndex] = interactionSub;

    // Monitor pool controls
    const poolActivity$ = combineLatest([
      poolCtrl.valueChanges.pipe(startWith(poolCtrl.value)),
      numToSelectCtrl.valueChanges.pipe(startWith(numToSelectCtrl.value))
    ]).pipe(
      map(([poolVal, numVal]) => (typeof poolVal === 'string' && poolVal.trim() !== '') || (typeof numVal === 'number' && numVal > 0))
    );

    interactionSub.add(poolActivity$.subscribe(isPoolActive => {
      if (isPoolActive) {
        if (manualQuestionsArr.enabled) {
          // console.log(`Section ${secIndex}: Pool active, disabling manual questions.`);
          while (manualQuestionsArr.length > 0) {
            manualQuestionsArr.removeAt(0, { emitEvent: false });
          }
          manualQuestionsArr.disable({ emitEvent: false });
        }
      } else {
        // Pool is not active, ensure manual questions array is enabled
        // This case is tricky because manualQuestionsArr.valueChanges will also fire.
        // The enabling of manualQuestionsArr should happen if pool becomes inactive AND manual questions are not driving the state.
        // This is covered by the manualQuestionsArr.valueChanges subscription.
        if (manualQuestionsArr.disabled && manualQuestionsArr.length === 0) { // Only enable if truly nothing is driving manual mode
            // console.log(`Section ${secIndex}: Pool inactive, enabling manual questions array.`);
            manualQuestionsArr.enable({ emitEvent: false });
        }
      }
    }));

    // Monitor manual questions array (length)
    interactionSub.add(manualQuestionsArr.valueChanges.pipe(
      startWith(manualQuestionsArr.value), // Check initial state
      map(questions => questions.length > 0)
    ).subscribe(isManualActive => {
      if (isManualActive) {
        if (poolCtrl.enabled || numToSelectCtrl.enabled) {
          // console.log(`Section ${secIndex}: Manual questions active, disabling pool controls.`);
          poolCtrl.setValue('', { emitEvent: false });
          numToSelectCtrl.setValue(0, { emitEvent: false });
          poolCtrl.disable({ emitEvent: false });
          numToSelectCtrl.disable({ emitEvent: false });
        }
      } else {
        // No manual questions, ensure pool controls are enabled
        // This case is tricky because poolActivity$ will also fire.
        // The enabling of pool controls should happen if manual becomes inactive AND pool is not driving the state.
        if (poolCtrl.disabled && poolCtrl.value.trim() === '' && numToSelectCtrl.disabled && numToSelectCtrl.value === 0) {
            // console.log(`Section ${secIndex}: Manual questions inactive, enabling pool controls.`);
            poolCtrl.enable({ emitEvent: false });
            numToSelectCtrl.enable({ emitEvent: false });
        }
      }
    }));

    // Initial state check to ensure consistency if form is pre-filled or reset
    // This logic might be redundant if startWith in subscriptions handles all initial cases.
    const initialPoolActive = (typeof poolCtrl.value === 'string' && poolCtrl.value.trim() !== '') || (typeof numToSelectCtrl.value === 'number' && numToSelectCtrl.value > 0);
    const initialManualActive = manualQuestionsArr.length > 0;

    if (initialPoolActive && !initialManualActive) {
        manualQuestionsArr.disable({ emitEvent: false });
    } else if (initialManualActive && !initialPoolActive) {
        poolCtrl.disable({ emitEvent: false });
        numToSelectCtrl.disable({ emitEvent: false });
    } else if (initialPoolActive && initialManualActive) {
        // Conflict: prioritize pool, clear manual (or vice-versa based on desired default)
        // console.warn(`Section ${secIndex}: Conflict in initial state. Prioritizing pool.`);
        while (manualQuestionsArr.length > 0) {
            manualQuestionsArr.removeAt(0, { emitEvent: false });
        }
        manualQuestionsArr.disable({ emitEvent: false });
        poolCtrl.enable({ emitEvent: false }); // Ensure pool controls are enabled
        numToSelectCtrl.enable({ emitEvent: false });
    } else { // Neither active, ensure both are enabled
        manualQuestionsArr.enable({ emitEvent: false });
        poolCtrl.enable({ emitEvent: false });
        numToSelectCtrl.enable({ emitEvent: false });
    }
  }

  /**
   * @getter sections
   * @description Getter method to access the sections FormArray from the reactive form.
   * Provides type-safe access to the form array containing all test sections.
   * 
   * @returns {FormArray} The sections FormArray containing all test paper sections
   * 
   * @example
   * ```typescript
   * // Access sections programmatically
   * const sectionCount = this.sections.length;
   * const firstSection = this.sections.at(0);
   * 
   * // Used in template
   * *ngFor="let section of sections.controls; let i = index"
   * ```
   */
  get sections(): FormArray {
    return this.seriesForm.get('sections') as FormArray;
  }

  /**
   * @method addSection
   * @description Adds a new test section to the form with default configuration.
   * Creates reactive form controls for section properties, search functionality, and interaction logic.
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Add new section to test paper
   * this.addSection();
   * 
   * // Creates section with:
   * // - Title and order fields
   * // - Question array for manual selection
   * // - Question pool for batch selection
   * // - Marks configuration
   * // - Search and interaction setup
   * ```
   */  addSection() {
    const sectionForm = this.fb.group({
      title: ['', Validators.required],
      order: [this.sections.length + 1, Validators.required],
      questions: this.fb.array([]),
      questionPool: [''], // Initialize as empty string or appropriate default
      questionsToSelectFromPool: [0, Validators.min(0)], 
      defaultMarksForPooledQuestion: [1, Validators.min(0)], // ADDED
      defaultNegativeMarksForPooledQuestion: [0, Validators.min(0)], // ADDED
      randomizeQuestionOrderInSection: [false],
      questionIndexing: ['continue'] // ADDED: 'continue' from previous section or 'reset' to start from 1
    });    this.sections.push(sectionForm);
    const newIndex = this.sections.length - 1;
    this.previewedQuestions[newIndex] = [];
    this.sectionSearchTerms[newIndex] = '';
    this.sectionSearchResults[newIndex] = [];
    this.sectionPoolConfigVisible[newIndex] = false; // Default to hidden    this.sectionDefaultSearchMarks[newIndex] = 1; // Default to 1 mark
    this.sectionDefaultSearchNegativeMarks[newIndex] = 0.33; // Default to 0.33 negative marks
    this.setupSearchDebouncer(newIndex);
    this.setupSectionInteractionLogic(newIndex); // ADDED: Call to setup interaction logic for the new section
  }

  /**
   * @method removeSection
   * @description Removes a test section from the form and cleans up associated data structures.
   * Properly unsubscribes from observables and removes related arrays to prevent memory leaks.
   * 
   * @param {number} i - Index of the section to remove
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Remove section at index 1
   * this.removeSection(1);
   * 
   * // Cleanup operations:
   * // - Remove from FormArray
   * // - Clear search data
   * // - Unsubscribe observables
   * // - Clean up preview data
   * ```
   */  removeSection(i: number) {
    this.sections.removeAt(i);
    this.sectionSearchTerms.splice(i, 1);
    this.sectionSearchResults.splice(i, 1);
    this.previewedQuestions.splice(i, 1);
    this.sectionPoolConfigVisible.splice(i, 1); // Clean up toggle state
    this.sectionDefaultSearchMarks.splice(i, 1); // Clean up default marks
    this.sectionDefaultSearchNegativeMarks.splice(i, 1); // Clean up default negative marks
    if (this.searchSubscriptions[i]) {
      this.searchSubscriptions[i].unsubscribe();    }
    this.searchSubscriptions.splice(i, 1); // Remove from array to keep indices aligned

    if (this.searchDebouncers[i]) {
      this.searchDebouncers[i].complete();
    }
    this.searchDebouncers.splice(i, 1); // Remove from array

    if (this.sectionInteractionSubscriptions[i]) { // ADDED: Cleanup for interaction subscription
      this.sectionInteractionSubscriptions[i].unsubscribe();    }
    this.sectionInteractionSubscriptions.splice(i, 1);
  }

  /**
   * @method togglePoolConfig
   * @description Toggles the visibility of the Question Pool Configuration section for a specific section.
   * 
   * @param {number} sectionIndex - Index of the section to toggle
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Toggle pool config visibility for section 0
   * this.togglePoolConfig(0);
   * ```
   */
  togglePoolConfig(sectionIndex: number): void {
    this.sectionPoolConfigVisible[sectionIndex] = !this.sectionPoolConfigVisible[sectionIndex];
  }

  /**
   * @method getQuestionStartIndex
   * @description Calculates the starting question number for a section based on its indexing setting.
   * 
   * @param {number} sectionIndex - Index of the section
   * @returns {number} The starting question number for this section
   * 
   * @example
   * ```typescript
   * // Section 0: always starts from 1
   * // Section 1 with 'reset': starts from 1
   * // Section 1 with 'continue': starts from (previous section question count + 1)
   * const startIndex = this.getQuestionStartIndex(1);
   * ```
   */
  getQuestionStartIndex(sectionIndex: number): number {
    if (sectionIndex === 0) {
      return 1; // First section always starts from 1
    }

    const currentSection = this.sections.at(sectionIndex);
    const indexingMode = currentSection?.get('questionIndexing')?.value;

    if (indexingMode === 'reset') {
      return 1; // Reset numbering to start from 1
    }

    // Continue from previous section
    let totalPreviousQuestions = 0;
    for (let i = 0; i < sectionIndex; i++) {
      const sectionQuestions = this.getQuestions(i);
      const poolQuestions = this.sections.at(i)?.get('questionsToSelectFromPool')?.value || 0;
      totalPreviousQuestions += Math.max(sectionQuestions.length, poolQuestions);
    }

    return totalPreviousQuestions + 1;
  }

  /**
   * @method getQuestionDisplayNumber
   * @description Gets the display number for a specific question in a section.
   * 
   * @param {number} sectionIndex - Index of the section
   * @param {number} questionIndex - Index of the question within the section
   * @returns {number} The display number for this question
   */
  getQuestionDisplayNumber(sectionIndex: number, questionIndex: number): number {
    return this.getQuestionStartIndex(sectionIndex) + questionIndex;
  }

  /**
   * @method getQuestions
   * @description Retrieves the questions FormArray for a specific section.
   * Provides type-safe access to the questions array within a section.
   * 
   * @param {number} secIndex - Index of the section to get questions from
   * @returns {FormArray} The FormArray containing questions for the specified section
   * 
   * @example
   * ```typescript
   * // Get questions array for section 0
   * const questionsArray = this.getQuestions(0);
   * const questionCount = questionsArray.length;
   * 
   * // Add new question to the array
   * questionsArray.push(this.fb.group({...}));
   * ```
   */
  getQuestions(secIndex: number): FormArray {
    return this.sections.at(secIndex).get('questions') as FormArray;
  }

  /**
   * @method addQuestion
   * @description Adds a new question to a specific section with default marks configuration.
   * Validates that manual question entry is enabled before adding.
   * 
   * @param {number} secIndex - Index of the section to add the question to
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Add new question to section 0
   * this.addQuestion(0);
   * 
   * // Creates question form with:
   * // - Question ID field
   * // - Marks (default: 1)
   * // - Negative marks (default: 0)
   * // - Validation rules
   * ```
   */
  addQuestion(secIndex: number) {
    const sectionGroup = this.sections.at(secIndex) as FormGroup;
    if (sectionGroup.get('questions')?.disabled) {
      // console.log(`Section ${secIndex}: Cannot add manual question, pool mode is active or manual questions disabled.`);
      this.notificationService.showWarning('Manual Question Disabled', 'Cannot add manual question when question pool is active or manual entry is disabled for this section.');
      return;
    }
    const qArray = this.getQuestions(secIndex);
    const newIndex = qArray.length;
    qArray.push(this.fb.group({
      question:       ['', Validators.required],
      marks:          [1, [Validators.required, Validators.min(0)]],
      negativeMarks:  [0, [Validators.required, Validators.min(0)]]
    }));
    this.previewedQuestions[secIndex] = this.previewedQuestions[secIndex] || [];
    this.previewedQuestions[secIndex][newIndex] = null;
  }

  /**
   * @method removeQuestion
   * @description Removes a question from a specific section and cleans up preview data.
   * 
   * @param {number} secIndex - Index of the section containing the question
   * @param {number} qIndex - Index of the question to remove within the section
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Remove question at index 2 from section 1
   * this.removeQuestion(1, 2);
   * 
   * // Operations:
   * // - Remove from FormArray
   * // - Clean up preview data
   * // - Maintain array indices
   * ```
   */
  removeQuestion(secIndex: number, qIndex: number) {
    this.getQuestions(secIndex).removeAt(qIndex);
    if (this.previewedQuestions[secIndex]) {
      this.previewedQuestions[secIndex].splice(qIndex, 1);
    }
  }

  /**
   * @getter computedTotal
   * @description Calculates the total marks for the entire test by summing marks from all sections.
   * Dynamically computes the total based on current form values.
   * 
   * @returns {number} Total marks for the complete test paper
   * 
   * @example
   * ```typescript
   * // Get current total marks
   * const totalMarks = this.computedTotal; // e.g., 150
   * 
   * // Used in template for display
   * <span>Total Marks: {{ computedTotal }}</span>
   * 
   * // Automatically updates when questions change
   * ```
   */
  get computedTotal(): number {
    return this.sections.controls.reduce((secSum, secCtrl) => {
      const qArr = secCtrl.get('questions') as FormArray;
      return secSum + qArr.controls.reduce((qSum, qCtrl) => qSum + (qCtrl.get('marks')!.value || 0), 0);
    }, 0);
  }

  /**
   * @method importCsv
   * @description Imports question IDs from a CSV file and adds them to a specific section.
   * Validates file format and ensures manual question entry is enabled.
   * 
   * @param {Event} event - File input change event containing the CSV file
   * @param {number} secIndex - Index of the section to import questions into
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Handle CSV file import
   * <input type="file" (change)="importCsv($event, 0)" accept=".csv">
   * 
   * // Expected CSV format:
   * // 507f1f77bcf86cd799439011
   * // 507f1f77bcf86cd799439012
   * // (One question ID per line, 24 characters each)
   * ```
   */
  importCsv(event: Event, secIndex: number) {
    const sectionGroup = this.sections.at(secIndex) as FormGroup;
    if (sectionGroup.get('questions')?.disabled) {
      // console.log(`Section ${secIndex}: Cannot import CSV, pool mode is active or manual questions disabled.`);
      this.notificationService.showWarning('CSV Import Disabled', 'Cannot import CSV when question pool is active or manual entry is disabled for this section.');
      return;
    }
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const lines = (reader.result as string)
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l && l.length === 24);
      lines.forEach(id => {
        this.getQuestions(secIndex).push(this.fb.group({
          question: [id, Validators.required],
          marks:    [1, [Validators.required, Validators.min(0)]]
        }));
      });
    };
    reader.readAsText(file);
  }

  /**
   * @method previewQuestion
   * @description Fetches and displays question details for preview in the UI.
   * Validates question ID format and handles API errors gracefully.
   * 
   * @param {number} secIndex - Index of the section containing the question
   * @param {number} qIndex - Index of the question within the section
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Preview question at section 0, question 1
   * this.previewQuestion(0, 1);
   * 
   * // Displays:
   * // - Question text
   * // - Answer options
   * // - Subject/topic information
   * // - Error message if not found
   * ```
   */
  previewQuestion(secIndex: number, qIndex: number) {
    const id = this.getQuestions(secIndex).at(qIndex).get('question')?.value;
    if (!id || String(id).length !== 24) {
        this.previewedQuestions[secIndex] = this.previewedQuestions[secIndex] || [];
        this.previewedQuestions[secIndex][qIndex] = { questionText: 'Invalid ID format' };
        return;
    }
    this.qService.getQuestionById(id).subscribe({
      next: question => {
        // ensure nested arrays exist
        this.previewedQuestions[secIndex] = this.previewedQuestions[secIndex] || [];
        this.previewedQuestions[secIndex][qIndex] = question;
      },
      error: () => {
        this.previewedQuestions[secIndex] = this.previewedQuestions[secIndex] || [];
        this.previewedQuestions[secIndex][qIndex] = { translations: [{ questionText: 'Not found' }] }; // Match structure
      }
    });
  }
  /**
   * @method onSubmit
   * @description Handles form submission for test series creation.
   * Validates form data, ensures minimum question requirements, processes question pools,
   * and handles shift creation before submitting to the backend.
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Called from template
   * <form (ngSubmit)="onSubmit()">
   * 
   * // Validation checks:
   * // - Form validity
   * // - Minimum 2 questions
   * // - Shift selection/creation
   * // - Question pool processing
   * ```
   */
  onSubmit() {
    if (this.seriesForm.invalid) {
      console.error('Form is invalid!', this.seriesForm.errors);
      return;
    }

    // Validate that the test series has at least two questions
    const hasEnoughQuestions = this.validateMinimumQuestions(2); // Require at least 2 questions
    if (!hasEnoughQuestions) {
      this.notificationService.showError('Insufficient Questions', 'Test series must have at least 2 questions. Please add more questions before submitting.');
      return;
    }

    // Get form values using getRawValue to include disabled controls
    const formValues = this.seriesForm.getRawValue();
    const paperId = formValues.paper;

    // Process the question pool from comma-separated string to array
    if (formValues.sections) {
      formValues.sections.forEach((section: any) => {
        // Ensure questionPool is an array of strings
        if (typeof section.questionPool === 'string') {
          section.questionPool = section.questionPool.split(',')
            .map((id: string) => id.trim())
            .filter((id: string) => id && id.length > 0); // Ensure IDs are valid
        } else if (section.questionPool === null || section.questionPool === undefined) {
          section.questionPool = [];
        }
      });
    }

    // Check if shift is selected or needs to be created automatically
    if (!formValues.shift && paperId) {
      console.log('No shift selected, trying to get or create a default one');
      // Use the getOrCreateDefaultShift method to either get an existing shift or create a default one
      this.shiftService.getOrCreateDefaultShift(paperId).subscribe({
        next: (shift) => {
          console.log('Using default shift:', shift);
          // Create a new object with the shift ID
          const valuesWithShift = { ...formValues, shift: shift._id };
          this.submitTestSeries(valuesWithShift);
        },
        error: (err) => {
          console.error('Failed to get or create default shift:', err);
          this.notificationService.showError('Shift Creation Failed', 'Failed to create default shift. Please try again or manually select a shift.');
        }
      });
    } else {
      // Shift is already selected or not required, proceed with form submission
      this.submitTestSeries(formValues);
    }
  }
  /**
   * @private
   * @method submitTestSeries
   * @description Helper method to submit the processed test series data to the backend.
   * Handles API response and provides user feedback.
   * 
   * @param {any} formValues - Processed form values ready for backend submission
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Internal usage after validation
   * this.submitTestSeries(processedFormData);
   * 
   * // Handles:
   * // - API call to create test series
   * // - Success notification
   * // - Error handling and user feedback
   * ```
   */
  // Helper method to submit the test series to the backend
  private submitTestSeries(formValues: any) {
    this.tsService.create(formValues as Partial<TestSeries>)
      .subscribe({
        next: (res: any) => { 
          this.notificationService.showSuccess('Test Series Created!', 'Your test series has been created successfully.'); 
        },
        error: (err: any) => { 
          this.notificationService.showError('Creation Failed', 'Creation failed: ' + (err.message || 'Unknown error')); 
        }
      });
  }

  /**
   * @method onFamilyChange
   * @description Handles exam family selection change event.
   * Resets dependent dropdown values and manages UI state for cascade functionality.
   * 
   * @param {string} familyId - Selected exam family ID
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Called from template dropdown
   * <select (change)="onFamilyChange($event.target.value)">
   * 
   * // Cascade behavior:
   * // - Clear stream, paper, shift values
   * // - Reset dependent data arrays
   * // - Trigger stream loading
   * ```
   */
  onFamilyChange(familyId: string) {
    console.log(`Family changed to ${familyId}`);
    // The valueChanges subscription will handle loading streams
    
    // Reset the form values for dependent fields to ensure UI consistency
    if (!familyId || familyId === '') {
      this.seriesForm.get('stream')!.setValue('', { emitEvent: true });
      this.seriesForm.get('paper')!.setValue('', { emitEvent: true });
      this.seriesForm.get('shift')!.setValue('', { emitEvent: true });
      this.streams = [];
      this.papers = [];
      this.shifts = [];
    } else {
      // When streams are loading, check after a brief delay if we have any streams
      setTimeout(() => {
        if (this.streams.length === 0) {
          console.log('[BuildPaperComponent] No streams found for this family. Disabling dropdown.');
          this.seriesForm.get('stream')?.disable();
        }
      }, 500);
    }
  }

  /**
   * @method onStreamChange
   * @description Handles exam stream selection change event.
   * Resets paper and shift values as part of the hierarchical dropdown cascade.
   * 
   * @param {string} streamId - Selected exam stream ID
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Called from template dropdown
   * <select (change)="onStreamChange($event.target.value)">
   * 
   * // Cascade behavior:
   * // - Clear paper and shift values
   * // - Reset dependent data arrays
   * // - Trigger paper loading
   * ```
   */
  onStreamChange(streamId: string) {
    console.log(`Stream changed to ${streamId}`);
    // The valueChanges subscription will handle loading papers
    // This method is for additional logic if needed
    
    // Reset paper and shift if stream is empty
    if (!streamId || streamId === '') {
      this.seriesForm.get('paper')!.setValue('', { emitEvent: true });
      this.seriesForm.get('shift')!.setValue('', { emitEvent: true });
      this.papers = [];
      this.shifts = [];
    }
  }

  /**
   * @method onPaperChange
   * @description Handles exam paper selection change event.
   * Resets shift value as part of the hierarchical dropdown cascade.
   * 
   * @param {string} paperId - Selected exam paper ID
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Called from template dropdown
   * <select (change)="onPaperChange($event.target.value)">
   * 
   * // Cascade behavior:
   * // - Clear shift value
   * // - Reset shifts data array
   * // - Trigger shift loading
   * ```
   */
  onPaperChange(paperId: string) {
    console.log(`Paper changed to ${paperId}`);
    // The valueChanges subscription will handle loading shifts
    // This method is for additional logic if needed
    
    // Reset shift if paper is empty
    if (!paperId || paperId === '') {
      this.seriesForm.get('shift')!.setValue('', { emitEvent: true });
      this.shifts = [];
    }
  }

  /**
   * @method onShiftChange
   * @description Handles exam shift selection change event.
   * Provides extension point for additional logic when shift selection changes.
   * 
   * @param {string} shiftId - Selected exam shift ID
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Called from template dropdown
   * <select (change)="onShiftChange($event.target.value)">
   * 
   * // Currently used for:
   * // - Logging shift selection
   * // - Future extension point for shift-specific logic
   * ```
   */
  onShiftChange(shiftId: string) {
    console.log(`Shift changed to ${shiftId}`);
    // This method is for additional logic if needed when shift changes
  }

  /**
   * @method performSearch
   * @description Performs real-time search through the question bank for a specific section.
   * Filters questions based on search term matching in question text translations.
   * 
   * @param {number} secIndex - Index of the section performing the search
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Triggered by debounced search input
   * this.performSearch(0); // Search for section 0
   * 
   * // Search criteria:
   * // - Minimum 3 characters required
   * // - Case-insensitive matching
   * // - Searches in all translation texts
   * // - Updates sectionSearchResults array
   * ```
   */
  performSearch(secIndex: number) {
    const currentSearchTerm = this.sectionSearchTerms[secIndex];
    // console.log(`[DEBUG] performSearch - Section: ${secIndex}, Term: "${currentSearchTerm}"`);
    // console.log('[DEBUG] performSearch - Current questionsList:', JSON.stringify(this.questionsList?.slice(0, 1)));

    if (!this.questionsList || this.questionsList.length === 0) {
      if (this.sectionSearchResults[secIndex]) {
        this.sectionSearchResults[secIndex] = [];
      }
      return;
    }

    if (!this.sectionSearchResults[secIndex]) {
      this.sectionSearchResults[secIndex] = [];
    }

    const processedTerm = currentSearchTerm ? currentSearchTerm.trim().toLowerCase() : '';

    if (processedTerm.length > 2) {
      this.sectionSearchResults[secIndex] = this.questionsList.filter(q => {
        // Ensure q.translations is an array and has elements
        if (q.translations && Array.isArray(q.translations)) {
          // Search within each translation's questionText
          return q.translations.some(translation => {
            const text = translation.questionText;
            // Ensure questionText is a string and not null/undefined before calling string methods
            if (typeof text === 'string') {
              return text.toLowerCase().includes(processedTerm);
            }
            return false; // If questionText is not a string or is missing, it can't match
          });
        }
        return false; // If translations array is missing or not an array, it can't match
      });
      // console.log("[DEBUG] performSearch - Results:", JSON.stringify(this.sectionSearchResults[secIndex]));
    } else {
      this.sectionSearchResults[secIndex] = []; // Clear results if term is too short or empty
    }
  }
  /**
   * @method onSearchInputChanged
   * @description Handles search input change events with debouncing.
   * Validates that manual question entry is enabled before triggering search.
   * 
   * @param {number} secIndex - Index of the section where search input changed
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Called from template search input
   * <input (input)="onSearchInputChanged(0)" [(ngModel)]="sectionSearchTerms[0]">
   * 
   * // Behavior:
   * // - Checks if manual questions are enabled
   * // - Triggers debounced search via subject
   * // - Prevents search when pool mode is active
   * ```
   */
  // Called from the template on search input change
  onSearchInputChanged(secIndex: number): void {
    const sectionGroup = this.sections.at(secIndex) as FormGroup;
    if (sectionGroup.get('questions')?.disabled) {
      // console.log(`Section ${secIndex}: Search disabled, pool mode is active.`);
      return; // Don't search if manual questions are disabled
    }
    this.searchDebouncers[secIndex].next(this.sectionSearchTerms[secIndex]);
  }

  /**
   * @method addQuestionFromSearchResults
   * @description Adds a question from search results to a specific section.
   * Validates permissions, creates form controls, and clears search state.
   * 
   * @param {number} secIndex - Index of the section to add the question to
   * @param {Question} questionToAdd - Question object from search results to add
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Called from template search results
   * <button (click)="addQuestionFromSearchResults(0, question)">Add</button>
   * 
   * // Operations:
   * // - Validates manual entry is enabled
   * // - Creates question form group
   * // - Adds to preview data
   * // - Clears search results
   * ```
   */  addQuestionFromSearchResults(secIndex: number, questionToAdd: Question) {
    const sectionGroup = this.sections.at(secIndex) as FormGroup;
    if (sectionGroup.get('questions')?.disabled) {
      // console.log(`Section ${secIndex}: Cannot add from search results, pool mode is active.`);
      this.notificationService.showWarning('Question Pool Active', 'Cannot add question from search results when question pool is active or manual entry is disabled for this section.');
      return;
    }    const questionsArray = this.getQuestions(secIndex);
    const newIndex = questionsArray.length;

    // Use default marks if set, otherwise fallback to 1 and 0
    const defaultMarks = this.sectionDefaultSearchMarks[secIndex] || 1;
    const defaultNegativeMarks = this.sectionDefaultSearchNegativeMarks[secIndex] || 0;

    questionsArray.push(this.fb.group({
      // MODIFIED: Use helper to ensure string ID is stored
      question: [this.getQuestionIdString(questionToAdd._id), Validators.required],
      marks: [defaultMarks, [Validators.required, Validators.min(0)]],
      negativeMarks: [defaultNegativeMarks, [Validators.required, Validators.min(0)]]
    }));

    this.previewedQuestions[secIndex] = this.previewedQuestions[secIndex] || [];
    this.previewedQuestions[secIndex][newIndex] = questionToAdd;

    this.sectionSearchTerms[secIndex] = '';
    this.sectionSearchResults[secIndex] = [];

    // Manually trigger the debouncer with an empty string to clear results via performSearch
    if (this.searchDebouncers[secIndex]) {
      this.searchDebouncers[secIndex].next('');
    }    // Auto-scroll to keep the search section visible with reduced scroll distance
    setTimeout(() => {
      const searchElement = document.getElementById(`search-section-${secIndex}`);
      if (searchElement) {
        const elementRect = searchElement.getBoundingClientRect();
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const elementTop = elementRect.top + currentScrollTop;
        
        // Reduce scroll distance by 50% - scroll to a position where element is 50% down from top
        const viewportHeight = window.innerHeight;
        const targetScrollPosition = elementTop - (viewportHeight * 0.5);
        
        window.scrollTo({
          top: Math.max(0, targetScrollPosition),
          behavior: 'smooth'
        });
      }
    }, 100);
  }
  /**
   * @private
   * @method validateMinimumQuestions
   * @description Validates that the test series meets minimum question requirements.
   * Counts questions from both manual selection and question pools across all sections.
   * 
   * @param {number} minQuestions - Minimum number of questions required for the test
   * @returns {boolean} True if minimum requirement is met, false otherwise
   * 
   * @example
   * ```typescript
   * // Validate before submission
   * const isValid = this.validateMinimumQuestions(2);
   * if (!isValid) {
   *   alert('Test must have at least 2 questions');
   *   return;
   * }
   * 
   * // Counts from:
   * // - Manual questions in each section
   * // - Questions selected from pools
   * // - Considers section interaction states
   * ```
   */
  /**
   * Validates that the test series has at least the minimum required number of questions
   * @param minQuestions Minimum number of questions required
   * @returns boolean indicating if the requirement is met
   */
  private validateMinimumQuestions(minQuestions: number): boolean {
    let totalQuestions = 0;

    // Count questions from each section
    if (this.sections.length > 0) {
      // Count manually added questions in each section
      for (let i = 0; i < this.sections.length; i++) {
        const sectionGroup = this.sections.at(i) as FormGroup;
        const questionArray = sectionGroup.get('questions') as FormArray;
        
        // Count manual questions if enabled
        if (!questionArray.disabled) {
          totalQuestions += questionArray.length;
        }
        
        // Count questions from the question pool if using pool
        const poolCtrl = sectionGroup.get('questionPool');
        const numToSelectCtrl = sectionGroup.get('questionsToSelectFromPool');
        
        if (poolCtrl && numToSelectCtrl && !poolCtrl.disabled && !numToSelectCtrl.disabled) {
          const poolValue = poolCtrl.value;
          const numToSelect = numToSelectCtrl.value;
          
          if (typeof poolValue === 'string' && poolValue.trim() !== '' && typeof numToSelect === 'number' && numToSelect > 0) {
            // Count the number of question IDs in the pool
            const questionIds = poolValue.split(',')
              .map((id: string) => id.trim())
              .filter((id: string) => id && id.length > 0);
            
            // Add the smaller of the number to select or total IDs in pool
            totalQuestions += Math.min(numToSelect, questionIds.length);
          }
        }
      }
    }    console.log(`Total questions in test series: ${totalQuestions}, minimum required: ${minQuestions}`);
    return totalQuestions >= minQuestions;
  }
}
