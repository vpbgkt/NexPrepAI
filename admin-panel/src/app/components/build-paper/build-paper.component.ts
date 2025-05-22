import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class BuildPaperComponent implements OnInit, OnDestroy { // MODIFIED: Implements OnDestroy
  seriesForm!: FormGroup;
  questionsList: Question[] = [];
  families: ExamFamily[] = [];
  streams:  ExamStream[] = [];
  papers:   ExamPaper[] = [];
  shifts:   ExamShift[] = [];
  currentYear: number = new Date().getFullYear();
  previewedQuestions: any[][] = [];
  sectionSearchTerms: string[] = [];
  sectionSearchResults: Question[][] = [];

  private searchDebouncers: Subject<string>[] = []; // MODIFIED: Changed Subject<number> to Subject<string>
  private searchSubscriptions: Subscription[] = [];
  private sectionInteractionSubscriptions: Subscription[] = []; // ADDED

  constructor(
    private fb: FormBuilder,
    private tsService: TestSeriesService,
    private qService: QuestionService,
    private efService: ExamFamilyService,
    private streamService: ExamStreamService,
    private paperService: ExamPaperService,
    private shiftService: ExamShiftService
  ) {}

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
  }
  ngOnInit(): void {
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
    });    // When family changes, load streams and reset dependent fields
    this.seriesForm.get('family')!.valueChanges.subscribe(familyId => {
      console.log('[BuildPaperComponent] Family selected. ID:', familyId);

      // Reset dependent form controls first
      this.seriesForm.get('stream')!.setValue(null, { emitEvent: false });
      this.seriesForm.get('paper')!.setValue(null, { emitEvent: false });
      this.seriesForm.get('shift')!.setValue(null, { emitEvent: false });
      console.log('[BuildPaperComponent] Dependent form controls (stream, paper, shift) reset.');

      // Clear data arrays for dropdown options
      this.streams = [];
      this.papers = [];
      this.shifts = [];
      console.log('[BuildPaperComponent] Dependent data arrays (streams, papers, shifts) cleared.');
      
      // Ensure the paper and shift dropdowns are disabled
      this.seriesForm.get('paper')?.disable();
      this.seriesForm.get('shift')?.disable();      if (familyId && String(familyId).trim() !== '') { // Ensure familyId is not null, undefined, or empty string
        console.log(`[BuildPaperComponent] Fetching streams for familyId: "${familyId}"`);
        this.streamService.getByFamily(familyId).subscribe({
          next: streamsData => {
            console.log('[BuildPaperComponent] Raw streams data received from service:', JSON.stringify(streamsData, null, 2));
            if (Array.isArray(streamsData)) {
              this.streams = streamsData;
              console.log(`[BuildPaperComponent] this.streams populated. Count: ${this.streams.length}. First item (if any):`, this.streams.length > 0 ? this.streams[0] : 'empty');
              
              // Enable the stream dropdown if streams are available
              if (this.streams.length > 0) {
                this.seriesForm.get('stream')?.enable();
              }
            } else {
              console.error('[BuildPaperComponent] streamsData is not an array:', streamsData);
              this.streams = []; // Ensure streams is an array
            }
          },
          error: err => {
            console.error('[BuildPaperComponent] Error fetching streams:', err);
            this.streams = []; // Clear streams on error
          }
        });
      } else {
        console.log('[BuildPaperComponent] familyId is null or empty. Not fetching streams. Dependent dropdowns will be empty.');
      }
    });    // When stream changes, load papers
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

    // Load your question bank
    this.qService.getAll().subscribe(q => this.questionsList = q);

    // Debounce search input
    // MODIFIED: setupSearchDebouncer and setupSectionInteractionLogic will be called in addSection
    // this.sections.controls.forEach((_, index) => this.setupSearchDebouncer(index));
  }

  ngOnDestroy(): void {
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

  get sections(): FormArray {
    return this.seriesForm.get('sections') as FormArray;
  }

  addSection() {
    const sectionForm = this.fb.group({
      title: ['', Validators.required],
      order: [this.sections.length + 1, Validators.required],
      questions: this.fb.array([]),
      questionPool: [''], // Initialize as empty string or appropriate default
      questionsToSelectFromPool: [0, Validators.min(0)], 
      defaultMarksForPooledQuestion: [1, Validators.min(0)], // ADDED
      defaultNegativeMarksForPooledQuestion: [0, Validators.min(0)], // ADDED
      randomizeQuestionOrderInSection: [false]
    });

    this.sections.push(sectionForm);
    const newIndex = this.sections.length - 1;
    this.previewedQuestions[newIndex] = [];
    this.sectionSearchTerms[newIndex] = '';
    this.sectionSearchResults[newIndex] = [];
    this.setupSearchDebouncer(newIndex);
    this.setupSectionInteractionLogic(newIndex); // ADDED: Call to setup interaction logic for the new section
  }

  removeSection(i: number) {
    this.sections.removeAt(i);
    this.sectionSearchTerms.splice(i, 1);
    this.sectionSearchResults.splice(i, 1);
    this.previewedQuestions.splice(i, 1);
    if (this.searchSubscriptions[i]) {
      this.searchSubscriptions[i].unsubscribe();
    }
    this.searchSubscriptions.splice(i, 1); // Remove from array to keep indices aligned

    if (this.searchDebouncers[i]) {
      this.searchDebouncers[i].complete();
    }
    this.searchDebouncers.splice(i, 1); // Remove from array

    if (this.sectionInteractionSubscriptions[i]) { // ADDED: Cleanup for interaction subscription
      this.sectionInteractionSubscriptions[i].unsubscribe();
    }
    this.sectionInteractionSubscriptions.splice(i, 1);
  }

  getQuestions(secIndex: number): FormArray {
    return this.sections.at(secIndex).get('questions') as FormArray;
  }

  addQuestion(secIndex: number) {
    const sectionGroup = this.sections.at(secIndex) as FormGroup;
    if (sectionGroup.get('questions')?.disabled) {
      // console.log(`Section ${secIndex}: Cannot add manual question, pool mode is active or manual questions disabled.`);
      alert('Cannot add manual question when question pool is active or manual entry is disabled for this section.');
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

  removeQuestion(secIndex: number, qIndex: number) {
    this.getQuestions(secIndex).removeAt(qIndex);
    if (this.previewedQuestions[secIndex]) {
      this.previewedQuestions[secIndex].splice(qIndex, 1);
    }
  }

  get computedTotal(): number {
    return this.sections.controls.reduce((secSum, secCtrl) => {
      const qArr = secCtrl.get('questions') as FormArray;
      return secSum + qArr.controls.reduce((qSum, qCtrl) => qSum + (qCtrl.get('marks')!.value || 0), 0);
    }, 0);
  }

  importCsv(event: Event, secIndex: number) {
    const sectionGroup = this.sections.at(secIndex) as FormGroup;
    if (sectionGroup.get('questions')?.disabled) {
      // console.log(`Section ${secIndex}: Cannot import CSV, pool mode is active or manual questions disabled.`);
      alert('Cannot import CSV when question pool is active or manual entry is disabled for this section.');
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
          marks:    [1, [Validators.required, Validators.min(0)]],
          negativeMarks: [0, [Validators.required, Validators.min(0)]]
        }));
      });
    };
    reader.readAsText(file);
  }

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
  onSubmit() {
    if (this.seriesForm.invalid) {
      console.error('Form is invalid!', this.seriesForm.errors);
      return;
    }

    // Validate that the test series has at least two questions
    const hasEnoughQuestions = this.validateMinimumQuestions(2); // Require at least 2 questions
    if (!hasEnoughQuestions) {
      alert('Test series must have at least 2 questions. Please add more questions before submitting.');
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
          alert('Failed to create default shift. Please try again or manually select a shift.');
        }
      });
    } else {
      // Shift is already selected or not required, proceed with form submission
      this.submitTestSeries(formValues);
    }
  }

  // Helper method to submit the test series to the backend
  private submitTestSeries(formValues: any) {
    this.tsService.create(formValues as Partial<TestSeries>)
      .subscribe({
        next: (res: any) => { 
          alert('Test Series created!'); 
        },
        error: (err: any) => { 
          alert('Creation failed: ' + (err.message || 'Unknown error')); 
        }
      });
  }

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

  onShiftChange(shiftId: string) {
    console.log(`Shift changed to ${shiftId}`);
    // This method is for additional logic if needed when shift changes
  }

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

  // Called from the template on search input change
  onSearchInputChanged(secIndex: number): void {
    const sectionGroup = this.sections.at(secIndex) as FormGroup;
    if (sectionGroup.get('questions')?.disabled) {
      // console.log(`Section ${secIndex}: Search disabled, pool mode is active.`);
      return; // Don't search if manual questions are disabled
    }
    this.searchDebouncers[secIndex].next(this.sectionSearchTerms[secIndex]);
  }

  addQuestionFromSearchResults(secIndex: number, questionToAdd: Question) {
    const sectionGroup = this.sections.at(secIndex) as FormGroup;
    if (sectionGroup.get('questions')?.disabled) {
      // console.log(`Section ${secIndex}: Cannot add from search results, pool mode is active.`);
      alert('Cannot add question from search results when question pool is active or manual entry is disabled for this section.');
      return;
    }
    const questionsArray = this.getQuestions(secIndex);
    const newIndex = questionsArray.length;

    questionsArray.push(this.fb.group({
      // MODIFIED: Use helper to ensure string ID is stored
      question: [this.getQuestionIdString(questionToAdd._id), Validators.required],
      marks: [1, [Validators.required, Validators.min(0)]],
      negativeMarks: [0, [Validators.required, Validators.min(0)]]
    }));

    this.previewedQuestions[secIndex] = this.previewedQuestions[secIndex] || [];
    this.previewedQuestions[secIndex][newIndex] = questionToAdd;

    this.sectionSearchTerms[secIndex] = '';
    this.sectionSearchResults[secIndex] = [];

    // Manually trigger the debouncer with an empty string to clear results via performSearch
    if (this.searchDebouncers[secIndex]) {
      this.searchDebouncers[secIndex].next('');
    }
  }

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
    }

    console.log(`Total questions in test series: ${totalQuestions}, minimum required: ${minQuestions}`);
    return totalQuestions >= minQuestions;
  }
}
