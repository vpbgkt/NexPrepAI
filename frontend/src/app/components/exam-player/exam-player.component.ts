import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormArray,
  FormGroup
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TestService, StartTestResponse } from '../../services/test.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// --- Enhanced Interfaces for Translations ---
interface QuestionOption {
  text: string;
  img?: string;
  isCorrect?: boolean; // Kept from original, backend might send it
  _id?: string;
}

interface QuestionTranslation {
  lang: 'en' | 'hi';
  questionText: string;
  images?: string[];
  options: QuestionOption[];
  // explanations?: any[]; // Add if needed later
}

interface QuestionHistoryItem {
  title: string;
  askedAt: string | Date; // Date pipe will handle string or Date
  _id?: string;
}

interface PlayerQuestion {
  question: string; // ID
  translations: QuestionTranslation[];
  marks?: number;
  type?: string;
  difficulty?: string;
  questionHistory?: QuestionHistoryItem[]; // ADDED: questionHistory
  // Properties to hold the currently displayed content based on language
  displayQuestionText: string;
  displayOptions: QuestionOption[];
  availableLanguages: string[];
  originalLanguageForDisplay: string; // Tracks if fallback occurred
}

interface PlayerSection {
  title: string;
  order: number;
  questions: PlayerQuestion[];
}
// --- End Interfaces ---

@Component({
  selector: 'app-exam-player',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './exam-player.component.html',
  styleUrls: ['./exam-player.component.scss']
})
export class ExamPlayerComponent implements OnInit {
  seriesId!: string;
  attemptId: string | undefined; // Ensure it can be undefined initially
  sections: PlayerSection[] = []; // Use new PlayerSection interface
  form: FormGroup;
  timeLeft = 0; // This will store remaining duration in seconds
  timerHandle!: any;
  hasSavedProgress: boolean = false;
  private savedResponses: any[] = [];

  // Properties to temporarily hold progress data if found
  private pendingAttemptId: string | undefined;
  private pendingTimeLeft: number = 0;
  private pendingSections: any[] = [];
  private pendingSavedResponses: any[] = [];

  // --- Language Properties ---
  currentLanguage: 'en' | 'hi' = 'en'; // Default to English
  readonly defaultLanguage: 'en' | 'hi' = 'en';
  // --- End Language Properties ---

  // New properties for section-aware navigation
  currentSectionIndex = 0;
  currentQuestionInSectionIndex = 0; // Index of the question within the current section

  // currentQuestionIndex will now refer to the global index in the flat responses FormArray
  // It will be updated whenever currentSectionIndex or currentQuestionInSectionIndex changes.
  currentGlobalQuestionIndex = 0;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private testSvc: TestService,
    private cd: ChangeDetectorRef
  ) {
    // Initialize with empty FormArray
    this.form = this.fb.group({
      responses: this.fb.array([])
    });
  }

  ngOnInit() {
    this.seriesId = this.route.snapshot.paramMap.get('seriesId')!;
    console.log(`ExamPlayer: ngOnInit for seriesId: ${this.seriesId}`);

    // Reset state for fresh load
    this.attemptId = undefined; // Crucial: ensure attemptId is initially undefined
    this.hasSavedProgress = false;
    this.pendingAttemptId = undefined;
    this.pendingTimeLeft = 0;
    this.pendingSections = [];
    this.pendingSavedResponses = [];

    this.testSvc.getProgress(this.seriesId).subscribe({
      next: progress => {
        console.log('FE: ngOnInit - getProgress response:', progress); // <--- ADD THIS LOG
        if (progress.attemptId && progress.sections && progress.sections.length > 0 && !progress.expired) { 
          // Store pending data but DON'T set this.attemptId yet
          this.pendingAttemptId = progress.attemptId;
          this.pendingTimeLeft = progress.remainingTime ?? 0;
          this.pendingSections = progress.sections; // Store raw sections
          this.pendingSavedResponses = progress.responses || [];
          console.log('FE: ngOnInit - PendingSavedResponses:', JSON.stringify(this.pendingSavedResponses, null, 2)); // <--- ADD THIS LOG
          this.hasSavedProgress = true; // This will show "Resume" / "Start New" buttons
          console.log('Progress found and stored pending. PendingAttemptId:', this.pendingAttemptId, 'PendingTimeLeft (s):', this.pendingTimeLeft);
        } else {
          this.hasSavedProgress = false; // No active, non-expired progress
          this.pendingAttemptId = undefined; // Clear any pending data
          if(progress.expired) {
            console.log('Progress found but it is expired.');
          } else {
            console.log('No active/valid progress found for this series.');
          }
        }
      },
      error: (err) => {
        this.hasSavedProgress = false;
        this.pendingAttemptId = undefined;
        console.error('Error fetching progress:', err);
      }
    });
  }

  // Public start method for the template
  start(): void {
    console.log('Starting new test...');
    this.hasSavedProgress = false; 
    this.savedResponses = [];
    // Clear pending data as we are starting fresh
    this.pendingAttemptId = undefined;
    this.pendingSections = [];
    this.pendingSavedResponses = [];
    this.pendingTimeLeft = 0;
    this.currentSectionIndex = 0; // Reset for new test
    this.currentQuestionInSectionIndex = 0; // Reset for new test
    // this.attemptId will be set by startNewTest() -> testSvc.startTest() response
    this.startNewTest();
  }

  resumeTest(): void {
    if (this.pendingAttemptId && this.pendingSections.length > 0) {
      this.attemptId = this.pendingAttemptId; // NOW set the active attemptId
      this.timeLeft = this.pendingTimeLeft;
      // processSections expects the structure from the backend, which pendingSections should be
      this.sections = this.processSections(this.pendingSections); 
      this.savedResponses = this.pendingSavedResponses;

      console.log('FE: resumeTest - AttemptId:', this.attemptId, 'TimeLeft:', this.timeLeft);
      console.log('FE: resumeTest - Sections processed:', this.sections.length);
      console.log('FE: resumeTest - this.savedResponses INITIALIZED:', JSON.stringify(this.savedResponses, null, 2)); // <--- ADD THIS LOG
      this.hasSavedProgress = false; // Clear the flag as we are now resuming
      
      // buildFormAndTimer will set currentSectionIndex, currentQuestionInSectionIndex, and currentGlobalQuestionIndex
      this.buildFormAndTimer(); 
      this.attachAutoSave();

      // Clear pending data after use
      this.pendingAttemptId = undefined;
      this.pendingSections = [];
      this.pendingSavedResponses = [];
      this.pendingTimeLeft = 0;
    } else {
      console.warn('Attempted to resume test without valid pending data. Starting new test instead.');
      this.start(); // Fallback
    }
  }

  private startNewTest() {
    this.testSvc.startTest(this.seriesId).subscribe({
      next: (res: StartTestResponse) => {
        console.log('startTest response:', res);
        this.attemptId = res.attemptId;
        // res.duration is in minutes, convert to seconds for timeLeft
        this.timeLeft = (res.duration || 0) * 60; 
        this.sections = this.processSections(res.sections);
        this.savedResponses = []; // Fresh test has no saved responses yet
        // buildFormAndTimer will set currentSectionIndex, currentQuestionInSectionIndex to 0,0
        // and currentGlobalQuestionIndex to 0
        this.buildFormAndTimer();
        this.attachAutoSave();
      },
      error: err => alert(err.error?.message || 'Failed to start test')
    });
  }

  private attachAutoSave() {
    this.form.valueChanges
      .pipe(
        debounceTime(2000),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(vals => {
        if (this.attemptId) { // Ensure attemptId is defined
          this.testSvc.saveProgress(this.attemptId, { responses: vals.responses, timeLeft: this.timeLeft }).subscribe({
            next: () => console.log('✔️ Auto-saved. TimeLeft:', this.timeLeft, 'Responses:', vals.responses.length),
            error: e => console.warn('Auto-save failed', e)
          });
        } else {
          console.warn('Auto-save skipped: attemptId is undefined.');
        }
      });
  }

  // Convenient getter for FormArray
  get responses(): FormArray {
    return this.form.get('responses') as FormArray;
  }

  submit() {
    clearInterval(this.timerHandle);

    if (!this.attemptId) { // Ensure attemptId is defined before submitting
      console.error('Cannot submit: attemptId is undefined.');
      alert('Error: Could not submit exam. Attempt ID is missing.');
      return;
    }

    const payload = this.responses.controls.map(ctrl => {
      const qId = ctrl.get('question')!.value;
      const raw = ctrl.get('selected')!.value;
      let selectedArr: number[];

      if (Array.isArray(raw)) {
        selectedArr = raw.map((v: string | number) => Number(v));
      } else if (typeof raw === 'string') {
        selectedArr = raw
          .split(',')
          .filter(x => x !== '')
          .map(x => Number(x));
      } else {
        selectedArr = [Number(raw)];
      }

      return { question: qId, selected: selectedArr };
    });

    this.testSvc.submitAttempt(this.attemptId, { responses: payload }).subscribe({
      next: () => {
        alert('Submission successful!');
        this.router.navigate([`/review/${this.attemptId}`]);
      },
      error: err => alert(err.error?.message || 'Submission failed')
    });
  }

  formatTime(sec: number): string {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // --- Navigation Methods ---
  goToQuestion(sectionIdx: number, questionInSectionIdx: number) {
    if (this.sections[sectionIdx] && this.sections[sectionIdx].questions[questionInSectionIdx]) {
      this.currentSectionIndex = sectionIdx;
      this.currentQuestionInSectionIndex = questionInSectionIdx;
      this.currentGlobalQuestionIndex = this.getGlobalIndex(sectionIdx, questionInSectionIdx);
      console.log(`Navigating to S:${sectionIdx}, Q:${questionInSectionIdx}, GlobalQ:${this.currentGlobalQuestionIndex}`);
    }
  }

  next() {
    if (this.currentQuestionInSectionIndex < this.sections[this.currentSectionIndex].questions.length - 1) {
      // Next question in the same section
      this.currentQuestionInSectionIndex++;
    } else if (this.currentSectionIndex < this.sections.length - 1) {
      // Next section, first question
      this.currentSectionIndex++;
      this.currentQuestionInSectionIndex = 0;
    } else {
      // Already at the last question of the last section
      return;
    }
    this.currentGlobalQuestionIndex = this.getGlobalIndex(this.currentSectionIndex, this.currentQuestionInSectionIndex);
  }

  prev() {
    if (this.currentQuestionInSectionIndex > 0) {
      // Previous question in the same section
      this.currentQuestionInSectionIndex--;
    } else if (this.currentSectionIndex > 0) {
      // Previous section, last question
      this.currentSectionIndex--;
      this.currentQuestionInSectionIndex = this.sections[this.currentSectionIndex].questions.length - 1;
    } else {
      // Already at the first question of the first section
      return;
    }
    this.currentGlobalQuestionIndex = this.getGlobalIndex(this.currentSectionIndex, this.currentQuestionInSectionIndex);
  }

  // --- Helper methods for template and logic ---
  getGlobalIndex(sectionIdx: number, questionInSectionIdx: number): number {
    let globalIndex = 0;
    for (let i = 0; i < sectionIdx; i++) {
      globalIndex += this.sections[i].questions.length;
    }
    globalIndex += questionInSectionIdx;
    return globalIndex;
  }

  getGlobalQuestionNumber(sectionIdx: number, questionInSectionIdx: number): number {
    return this.getGlobalIndex(sectionIdx, questionInSectionIdx) + 1;
  }

  isCurrentQuestion(sectionIdx: number, questionInSectionIdx: number): boolean {
    return this.currentSectionIndex === sectionIdx && this.currentQuestionInSectionIndex === questionInSectionIdx;
  }
  
  // Used by the *ngIf in the template to show the current question form
  isCurrentQuestionByIndex(globalIdx: number): boolean {
    return this.currentGlobalQuestionIndex === globalIdx;
  }

  isQuestionFlagged(sectionIdx: number, questionInSectionIdx: number): boolean {
    const globalIndex = this.getGlobalIndex(sectionIdx, questionInSectionIdx);
    const formCtrl = this.responses.at(globalIndex);
    return formCtrl ? formCtrl.get('review')!.value : false;
  }

  isFirstQuestionOverall(): boolean {
    return this.currentSectionIndex === 0 && this.currentQuestionInSectionIndex === 0;
  }

  isLastQuestionOverall(): boolean {
    if (!this.sections || this.sections.length === 0) return true; // Or false, depending on desired behavior for empty
    const lastSectionIdx = this.sections.length - 1;
    const lastQuestionInSectionIdx = this.sections[lastSectionIdx].questions.length - 1;
    return this.currentSectionIndex === lastSectionIdx && this.currentQuestionInSectionIndex === lastQuestionInSectionIdx;
  }
  
  // --- End Helper methods ---

  // Method to process sections and questions from the server
  // Backend now sends more detailed section info, so this might be simpler
  private processSections(sectionsFromServer: any[] | undefined): PlayerSection[] {
    if (!sectionsFromServer) {
      console.warn('processSections: sectionsFromServer is undefined or null');
      return [];
    }
    console.log('processSections input (raw from server):', JSON.stringify(sectionsFromServer, null, 2));

    return sectionsFromServer.map(section => {
      return {
        title: section.title,
        order: section.order,
        questions: (section.questions || []).map((originalQuestion: any): PlayerQuestion => {
          // originalQuestion.translations should be an array like [{lang: 'en', questionText: '...', options: [...]}, {lang: 'hi', ...}]
          const translations = (originalQuestion.translations || []) as QuestionTranslation[];
          if (translations.length === 0) {
            // Fallback if translations array is missing or empty (should ideally not happen with new model)
            translations.push({
              lang: this.defaultLanguage,
              questionText: originalQuestion.questionText || `Text for ${originalQuestion.question || originalQuestion._id} missing`,
              options: (originalQuestion.options || []).map((opt: any) => ({ text: opt.text, isCorrect: opt.isCorrect }))
            });
          }
          
          const initialDisplay = this.getTranslatedContentForQuestion(translations, this.currentLanguage);

          return {
            question: originalQuestion.question || originalQuestion._id, // ID
            translations: translations,
            marks: originalQuestion.marks,
            type: originalQuestion.type,
            difficulty: originalQuestion.difficulty,
            questionHistory: originalQuestion.questionHistory, // ADDED mapping for question history
            // Populate display properties
            displayQuestionText: initialDisplay.questionText,
            displayOptions: initialDisplay.options,
            availableLanguages: translations.map(t => t.lang),
            originalLanguageForDisplay: initialDisplay.langUsed
          };
        })
      };
    });
  }

  // --- Language Helper Methods ---
  private getTranslatedContentForQuestion(
    translations: QuestionTranslation[],
    targetLang: 'en' | 'hi'
  ): { questionText: string; options: QuestionOption[]; langUsed: 'en' | 'hi' } {
    let selectedTranslation = translations.find(t => t.lang === targetLang);
    let langUsed = targetLang;

    if (!selectedTranslation) {
      selectedTranslation = translations.find(t => t.lang === this.defaultLanguage) || translations[0];
      langUsed = selectedTranslation.lang; // Actual language being used
    }
    
    return {
      questionText: selectedTranslation.questionText,
      options: selectedTranslation.options,
      langUsed: langUsed
    };
  }

  changeLanguage(lang: 'en' | 'hi'): void {
    if (this.currentLanguage === lang) return;
    this.currentLanguage = lang;
    // localStorage.setItem('preferredLang', lang); // Optional: persist preference

    // Update display properties for all questions in the current sections data
    // This is important if questions are not re-processed on language change
    this.sections.forEach(section => {
      section.questions.forEach(question => {
        const newDisplayContent = this.getTranslatedContentForQuestion(question.translations, this.currentLanguage);
        question.displayQuestionText = newDisplayContent.questionText;
        question.displayOptions = newDisplayContent.options;
        question.originalLanguageForDisplay = newDisplayContent.langUsed;
      });
    });
    this.cd.detectChanges(); // Trigger change detection
  }

  // Getter for the currently displayed question's content (based on currentQuestionIndex and currentLanguage)
  get currentQuestionDisplayData(): PlayerQuestion | undefined {
    if (this.sections && 
        this.sections[this.currentSectionIndex] &&
        this.sections[this.currentSectionIndex].questions[this.currentQuestionInSectionIndex]) {
      return this.sections[this.currentSectionIndex].questions[this.currentQuestionInSectionIndex];
    }
    return undefined;
  }
  // --- End Language Helper Methods ---

  private buildFormAndTimer(): void {
    console.log('FE: buildFormAndTimer - Building form. TimeLeft:', this.timeLeft, 'Sections:', this.sections.length);
    console.log('FE: buildFormAndTimer - Using this.savedResponses:', JSON.stringify(this.savedResponses, null, 2));
    
    const responsesFormArray = this.form.get('responses') as FormArray;
    responsesFormArray.clear(); 

    let globalQuestionCounter = 0; // Initialize a counter for all questions across sections

    this.sections.forEach((sec, sIdx) => {
      sec.questions.forEach((q, qIdx) => {
        // Use the globalQuestionCounter to get the response from the ordered array
        const savedResponse = (this.savedResponses && globalQuestionCounter < this.savedResponses.length) 
                              ? this.savedResponses[globalQuestionCounter] 
                              : undefined;
        
        let initialSelectedValue = '';
        if (savedResponse && savedResponse.selected && Array.isArray(savedResponse.selected) && savedResponse.selected.length > 0) {
          initialSelectedValue = savedResponse.selected[0]; 
        } else if (savedResponse && savedResponse.selected && typeof savedResponse.selected === 'string') { // Handle if saved as string
            initialSelectedValue = savedResponse.selected;
        }

        // Ensure the question ID logged here is the one from the current question `q` in the loop,
        // and the savedResponse is the one fetched by index.
        console.log(`FE: buildFormAndTimer - GlobalIdx: ${globalQuestionCounter}, S:${sIdx}, Q_in_S:${qIdx}, Q_ID: ${q.question} - SavedResp: ${JSON.stringify(savedResponse)} - InitialSelected: '${initialSelectedValue}'`);

        const questionFormGroup = this.fb.group({
          question:      [q.question], // Store question ID
          selected:      [String(initialSelectedValue)], 
          review:        [savedResponse ? savedResponse.review || false : false],
          // Storing section/question index in form can be useful for debugging or complex logic later,
          // but primary navigation now uses component properties currentSectionIndex/currentQuestionInSectionIndex
          _sectionIndexDebug:  [sIdx], // For debugging, not directly used by core logic
          _questionIndexDebug: [qIdx]  // For debugging
        });
        responsesFormArray.push(questionFormGroup);
        globalQuestionCounter++; // Increment for the next question
      });
    });

    // Initialize current question display
    if (this.savedResponses.length > 0 && this.sections.length > 0) {
        let firstUnansweredGlobalIndex = -1;
        for(let i=0; i < responsesFormArray.controls.length; i++) { 
            const savedResp = (this.savedResponses && i < this.savedResponses.length) ? this.savedResponses[i] : undefined;
            if (!savedResp || !savedResp.selected || 
                (Array.isArray(savedResp.selected) && savedResp.selected.length > 0 && savedResp.selected[0] === '') ||
                (typeof savedResp.selected === 'string' && savedResp.selected === '')
            ) { 
                firstUnansweredGlobalIndex = i;
                break;
            }
        }
        
        if (firstUnansweredGlobalIndex !== -1) {
            this.currentGlobalQuestionIndex = firstUnansweredGlobalIndex;
        } else {
            this.currentGlobalQuestionIndex = 0; // Default to first question if all answered or no saved responses
        }

        // Convert global index back to section and question-in-section index
        let qCount = 0;
        let found = false;
        for (let sIdx = 0; sIdx < this.sections.length; sIdx++) {
            for (let qIdx = 0; qIdx < this.sections[sIdx].questions.length; qIdx++) {
                if (qCount === this.currentGlobalQuestionIndex) {
                    this.currentSectionIndex = sIdx;
                    this.currentQuestionInSectionIndex = qIdx;
                    found = true;
                    break;
                }
                qCount++;
            }
            if (found) break;
        }
        if (!found && this.sections.length > 0 && this.sections[0].questions.length > 0) { // Fallback if something went wrong
            this.currentSectionIndex = 0;
            this.currentQuestionInSectionIndex = 0;
            this.currentGlobalQuestionIndex = 0;
        }

    } else if (this.sections.length > 0 && this.sections[0].questions.length > 0) {
        this.currentSectionIndex = 0;
        this.currentQuestionInSectionIndex = 0;
        this.currentGlobalQuestionIndex = 0;
    } else {
        // No sections or questions, set to defaults that won't cause errors
        this.currentSectionIndex = 0;
        this.currentQuestionInSectionIndex = 0;
        this.currentGlobalQuestionIndex = 0;
    }

    console.log('Form built. Initial S:', this.currentSectionIndex, 'Q_in_S:', this.currentQuestionInSectionIndex, 'GlobalQ:', this.currentGlobalQuestionIndex);
    this.cd.detectChanges();

    // Timer initialization (this.timeLeft should already be in seconds)
    if (this.timerHandle) {
      clearInterval(this.timerHandle); // Clear existing timer if any
    }

    this.timerHandle = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.cd.detectChanges();
      } else {
        clearInterval(this.timerHandle);
        console.log('Timer reached zero. Submitting exam automatically.');
        this.submit(); 
      }
    }, 1000);
  }

  /**
   * Manually save the current form state.
   */
  manualSave() {
    if (!this.attemptId) { // Ensure attemptId is defined
      console.warn('Manual save skipped: attemptId is undefined.');
      return;
    }
    console.log('Manual save initiated. TimeLeft:', this.timeLeft);
    // Include timeLeft when saving progress
    const progressResponses = this.responses.controls.map(ctrl => ({
        question: ctrl.get('question')!.value,
        selected: ctrl.get('selected')!.value !== '' ? [Number(ctrl.get('selected')!.value)] : [], // Ensure it's an array, even if empty or single
        review: ctrl.get('review')!.value
    }));

    this.testSvc
      .saveProgress(this.attemptId, { responses: progressResponses, timeLeft: this.timeLeft })
      .subscribe({
        next: () => alert('✔️ Progress saved'),
        error: err => {
          console.warn('Manual save failed', err);
          alert('❌ Save failed');
        }
      });
  }
}
