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
import { Subject } from 'rxjs'; // Import Subject

interface QuestionOption {
  text: string;
  img?: string;
  isCorrect?: boolean;
  _id?: string;
}

interface QuestionTranslation {
  lang: 'en' | 'hi';
  questionText: string;
  images?: string[];
  options: QuestionOption[];
}

interface QuestionHistoryItem {
  title: string;
  askedAt: string | Date;
  _id?: string;
}

interface PlayerQuestion {
  question: string; 
  translations: QuestionTranslation[];
  marks?: number;
  type?: string;
  difficulty?: string;
  questionHistory?: QuestionHistoryItem[];
  displayQuestionText: string;
  displayOptions: QuestionOption[];
  availableLanguages: string[];
  originalLanguageForDisplay: string;
}

interface PlayerSection {
  title: string;
  order: number;
  questions: PlayerQuestion[];
}

@Component({
  selector: 'app-exam-player',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './exam-player.component.html',
  styleUrls: ['./exam-player.component.scss']
})
export class ExamPlayerComponent implements OnInit, OnDestroy { // Implement OnDestroy
  seriesId!: string;
  testSeriesTitle: string = 'Loading Test...';
  attemptId: string | undefined;
  sections: PlayerSection[] = [];
  form: FormGroup;
  timeLeft = 0;
  timerHandle!: any;
  hasSavedProgress: boolean = false;
  private savedResponses: any[] = [];

  private pendingAttemptId: string | undefined;
  private pendingTimeLeft: number = 0;
  private pendingSections: any[] = [];
  private pendingSavedResponses: any[] = [];

  currentLanguage: 'en' | 'hi' = 'en';
  readonly defaultLanguage: 'en' | 'hi' = 'en';

  currentSectionIndex = 0;
  currentQuestionInSectionIndex = 0;
  currentGlobalQuestionIndex = 0;

  // Map to store the Date object when a question viewing session starts
  private questionStartTimes: Map<number, Date> = new Map();

  // Define QuestionStatus object for use in getQuestionStatus method
  readonly QuestionStatus = {
    ANSWERED: 'answered',
    UNANSWERED: 'unanswered',
    MARKED_FOR_REVIEW: 'marked-for-review'
  };

  private destroy$ = new Subject<void>(); // Subject to signal component destruction

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

  start(): void {
    console.log('Starting new test...');
    this.hasSavedProgress = false;
    this.savedResponses = [];
    this.pendingAttemptId = undefined;
    this.currentSectionIndex = 0;
    this.currentQuestionInSectionIndex = 0;
    this.startNewTest();
  }

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

  private attachAutoSave() {
    this.form.valueChanges
      .pipe(
        debounceTime(5000),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntil(this.destroy$) // Unsubscribe when destroy$ emits
      )
      .subscribe(vals => {
        console.log('Form value changed, attempting auto-save:', vals);
        this.saveProgressInternal(false); // Call internal save, indicating it's an auto-save
      });
  }

  get responses(): FormArray {
    return this.form.get('responses') as FormArray;
  }

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

  formatTime(sec: number): string {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
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
          console.log(`[initializeQuestionControls] For QIK ${questionInstanceKey}: savedResponse.selected is:`, savedResponse.selected);
        } else {
          console.log(`[initializeQuestionControls] For QIK ${questionInstanceKey}: No savedResponse found.`);
        }

        let selectedValueToSetInForm: any[] = [];
        if (savedResponse && savedResponse.selected) {
          // Ensure `selected` is an array, as expected by checkbox/radio groups or multi-select
          selectedValueToSetInForm = Array.isArray(savedResponse.selected) ? savedResponse.selected : [savedResponse.selected];
        }
        // Log the value that will be set in the form
        console.log(`[initializeQuestionControls] For QIK ${questionInstanceKey}: selectedValueToSetInForm for form is:`, selectedValueToSetInForm);

        // For single-choice questions, the form control expects a single value, not an array.
        // Extract the first item if the array is not empty, otherwise use null.
        const finalValueForFormControl = selectedValueToSetInForm.length > 0 ? selectedValueToSetInForm[0] : null;
        console.log(`[initializeQuestionControls] For QIK ${questionInstanceKey}: finalValueForFormControl (single choice) is:`, finalValueForFormControl);


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
      }
    }, 1000);

    // this.attachAutoSave(); // Auto-save disabled for now
    this.navigateToInitialQuestion();
    this.cd.detectChanges(); 
  }

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

  private navigateToInitialQuestion() {
    this.currentSectionIndex = 0;
    this.currentQuestionInSectionIndex = 0;
    this.currentGlobalQuestionIndex = 0;
    if (this.sections.length > 0 && this.sections[0].questions.length > 0) {
      this.trackQuestionVisit(this.currentGlobalQuestionIndex); 
    }
  }

  goToQuestion(sectionIdx: number, questionInSectionIdx: number) {
    if (this.sections[sectionIdx] && this.sections[sectionIdx].questions[questionInSectionIdx]) {
      this.updateQuestionTimeSpent(this.currentGlobalQuestionIndex);

      this.currentSectionIndex = sectionIdx;
      this.currentQuestionInSectionIndex = questionInSectionIdx;
      this.currentGlobalQuestionIndex = this.getGlobalIndex(this.currentSectionIndex, this.currentQuestionInSectionIndex); 
      
      this.trackQuestionVisit(this.currentGlobalQuestionIndex);
      this.cd.detectChanges();
    }
  }

  next() {
    this.updateQuestionTimeSpent(this.currentGlobalQuestionIndex);

    if (this.currentQuestionInSectionIndex < this.sections[this.currentSectionIndex].questions.length - 1) {
      this.currentQuestionInSectionIndex++;
    } else if (this.currentSectionIndex < this.sections.length - 1) {
      this.currentSectionIndex++;
      this.currentQuestionInSectionIndex = 0;
    } else {
      // Already at the last question, do nothing or handle end of test
      // this.currentGlobalQuestionIndex = this.getGlobalIndex(this.currentSectionIndex, this.currentQuestionInSectionIndex); 
      // this.trackQuestionVisit(this.currentGlobalQuestionIndex); // Not needed if not moving
      return;
    }
    this.currentGlobalQuestionIndex = this.getGlobalIndex(this.currentSectionIndex, this.currentQuestionInSectionIndex);
    this.trackQuestionVisit(this.currentGlobalQuestionIndex); 
    this.cd.detectChanges();
  }

  prev() {
    this.updateQuestionTimeSpent(this.currentGlobalQuestionIndex); 

    if (this.currentQuestionInSectionIndex > 0) {
      this.currentQuestionInSectionIndex--;
    } else if (this.currentSectionIndex > 0) {
      this.currentSectionIndex--;
      this.currentQuestionInSectionIndex = this.sections[this.currentSectionIndex].questions.length - 1;
    } else {
      // Already at the first question, do nothing
      // this.currentGlobalQuestionIndex = this.getGlobalIndex(this.currentSectionIndex, this.currentQuestionInSectionIdx);
      // this.trackQuestionVisit(this.currentGlobalQuestionIndex); // Not needed if not moving
      return;
    }
    this.currentGlobalQuestionIndex = this.getGlobalIndex(this.currentSectionIndex, this.currentQuestionInSectionIndex);
    this.trackQuestionVisit(this.currentGlobalQuestionIndex); 
    this.cd.detectChanges();
  }

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
  
  isCurrentQuestionByIndex(globalIdx: number): boolean {
    return this.currentGlobalQuestionIndex === globalIdx;
  }

  isQuestionFlagged(sectionIdx: number, questionInSectionIdx: number): boolean {
    const globalIndex = this.getGlobalIndex(sectionIdx, questionInSectionIdx);
    return this.isQuestionFlaggedByIndex(globalIndex);
  }

  isQuestionFlaggedByIndex(globalIndex: number): boolean {
    const formCtrl = this.responses.at(globalIndex);
    return formCtrl ? formCtrl.get('flagged')?.value || false : false;
  }

  isFirstQuestionOverall(): boolean {
    return this.currentSectionIndex === 0 && this.currentQuestionInSectionIndex === 0;
  }

  isLastQuestionOverall(): boolean {
    if (!this.sections || this.sections.length === 0) return true;
    const lastSectionIdx = this.sections.length - 1;
    if (!this.sections[lastSectionIdx].questions || this.sections[lastSectionIdx].questions.length === 0) return true; // Handle empty last section
    const lastQuestionInSectionIdx = this.sections[lastSectionIdx].questions.length - 1;
    return this.currentSectionIndex === lastSectionIdx && this.currentQuestionInSectionIndex === lastQuestionInSectionIdx;
  }
  
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

  // Helper function to get translated content or fallbacks
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

  get currentQuestionDisplayData(): PlayerQuestion | undefined {
    const currentSection = this.sections[this.currentSectionIndex];
    if (currentSection && currentSection.questions && currentSection.questions.length > this.currentQuestionInSectionIndex) {
      const questionData = currentSection.questions[this.currentQuestionInSectionIndex]; // Corrected typo here
      return questionData;
    }
    return undefined;
  }

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

  // Renamed original manualSave to saveProgressInternal and added isManualTrigger parameter
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
    console.log('[saveProgressInternal] Payload to be sent:', JSON.stringify(payload, null, 2));

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

  // New public method for the manual save button in your HTML
  public triggerManualSave(): void {
    this.saveProgressInternal(true); // Call internal save, indicating it's a manual trigger
  }

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

  private trackAnswerChange(globalIndex: number): void {
    const formCtrl = this.responses.at(globalIndex) as FormGroup;
    if (formCtrl) {
      formCtrl.get('lastModifiedAt')?.setValue(new Date().toISOString());
    }
  }

  toggleQuestionFlag(globalIndex: number): void {
    const formCtrl = this.responses.at(globalIndex) as FormGroup;
    if (formCtrl) {
      const currentFlagged = formCtrl.get('flagged')?.value || false;
      formCtrl.get('flagged')?.setValue(!currentFlagged);
      formCtrl.get('lastModifiedAt')?.setValue(new Date().toISOString());
      this.cd.detectChanges(); 
    }
  }
  
  private attachAnswerChangeTracking(): void {
    this.responses.controls.forEach((control, index) => {
      control.get('selected')?.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
        this.trackAnswerChange(index);
      });
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    clearInterval(this.timerHandle); // Also clear the timer interval
    console.log('ExamPlayerComponent destroyed, auto-save and timer stopped.');
  }
}