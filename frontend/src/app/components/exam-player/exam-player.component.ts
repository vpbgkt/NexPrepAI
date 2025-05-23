import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormArray,
  FormGroup
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TestService, StartTestResponse, TestSeries } from '../../services/test.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
export class ExamPlayerComponent implements OnInit {
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

  QuestionStatus = {
    ANSWERED: 'answered',
    UNANSWERED: 'unanswered',
    MARKED_FOR_REVIEW: 'marked-for-review'
  };

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private testSvc: TestService,
    private cd: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      responses: this.fb.array([])
    });
  }

  ngOnInit() {
    this.seriesId = this.route.snapshot.paramMap.get('seriesId')!;
    console.log(`ExamPlayer: ngOnInit for seriesId: ${this.seriesId}`);

    if (this.seriesId) {
      this.testSvc.getSeries().subscribe({
        next: (allSeries: TestSeries[]) => {
          const currentSeries = allSeries.find(series => series._id === this.seriesId);
          if (currentSeries) {
            this.testSeriesTitle = currentSeries.title;
            console.log(`Fetched test series title: ${this.testSeriesTitle}`);
          } else {
            console.error(`Test series with ID ${this.seriesId} not found.`);
            this.testSeriesTitle = 'Test Not Found';
          }
        },
        error: (err: any) => {
          console.error('Error fetching all test series:', err);
          this.testSeriesTitle = 'Error Loading Test';
        }
      });
    }

    this.attemptId = undefined;
    this.hasSavedProgress = false;
    this.pendingAttemptId = undefined;
    this.pendingTimeLeft = 0;
    this.pendingSections = [];
    this.pendingSavedResponses = [];

    this.testSvc.getProgress(this.seriesId).subscribe({
      next: (progress: any) => {
        console.log('FE: ngOnInit - getProgress response:', progress);
        if (progress && progress.attemptId && progress.status === 'in-progress' && typeof progress.remainingDurationSeconds === 'number' && progress.remainingDurationSeconds > 0) {
          this.hasSavedProgress = true;
          this.pendingAttemptId = progress.attemptId;
          this.pendingTimeLeft = progress.remainingDurationSeconds;
          this.pendingSections = progress.sections || [];
          this.pendingSavedResponses = progress.responses || [];
        } else {
          this.hasSavedProgress = false;
          this.pendingAttemptId = undefined;
        }
      },
      error: (err: any) => {
        this.hasSavedProgress = false;
        this.pendingAttemptId = undefined;
        console.error('Error fetching progress:', err);
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
      this.attemptId = this.pendingAttemptId;
      this.timeLeft = this.pendingTimeLeft;
      this.sections = this.processSections(this.pendingSections);
      this.savedResponses = this.pendingSavedResponses;
      this.hasSavedProgress = false;
      this.buildFormAndTimer();
      this.attachAutoSave();
      this.pendingAttemptId = undefined;
    } else {
      this.start();
    }
  }

  private startNewTest() {
    this.testSvc.startTest(this.seriesId).subscribe({
      next: (res: StartTestResponse) => {
        this.attemptId = res.attemptId;
        this.timeLeft = (res.duration || 0) * 60;
        this.sections = this.processSections(res.sections);
        this.savedResponses = [];
        this.buildFormAndTimer();
        this.attachAutoSave();
      },
      error: (err: any) => alert(err.error?.message || 'Failed to start test')
    });
  }

  private attachAutoSave() {
    this.form.valueChanges
      .pipe(
        debounceTime(2000),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(vals => {
        if (this.attemptId) {
          this.testSvc.saveProgress(this.attemptId, { responses: vals.responses, timeLeft: this.timeLeft }).subscribe({
            next: () => console.log('✔️ Auto-saved. TimeLeft:', this.timeLeft),
            error: (e: any) => console.warn('Auto-save failed', e)
          });
        }
      });
  }

  get responses(): FormArray {
    return this.form.get('responses') as FormArray;
  }

  submit() {
    clearInterval(this.timerHandle);
    if (!this.attemptId) {
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
        selectedArr = raw.split(',').filter(x => x !== '').map(x => Number(x));
      } else {
        selectedArr = raw === null || raw === undefined || raw === '' ? [] : [Number(raw)];
      }
      return { question: qId, selected: selectedArr };
    });
    this.testSvc.submitAttempt(this.attemptId, { responses: payload }).subscribe({
      next: () => {
        alert('Submission successful!');
        this.router.navigate([`/review/${this.attemptId}`]);
      },
      error: (err: any) => alert(err.error?.message || 'Submission failed')
    });
  }

  formatTime(sec: number): string {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  goToQuestion(sectionIdx: number, questionInSectionIdx: number) {
    if (this.sections[sectionIdx] && this.sections[sectionIdx].questions[questionInSectionIdx]) {
      this.currentSectionIndex = sectionIdx;
      this.currentQuestionInSectionIndex = questionInSectionIdx;
      this.currentGlobalQuestionIndex = this.getGlobalIndex(sectionIdx, questionInSectionIdx);
    }
  }

  next() {
    if (this.currentQuestionInSectionIndex < this.sections[this.currentSectionIndex].questions.length - 1) {
      this.currentQuestionInSectionIndex++;
    } else if (this.currentSectionIndex < this.sections.length - 1) {
      this.currentSectionIndex++;
      this.currentQuestionInSectionIndex = 0;
    } else {
      return;
    }
    this.currentGlobalQuestionIndex = this.getGlobalIndex(this.currentSectionIndex, this.currentQuestionInSectionIndex);
  }

  prev() {
    if (this.currentQuestionInSectionIndex > 0) {
      this.currentQuestionInSectionIndex--;
    } else if (this.currentSectionIndex > 0) {
      this.currentSectionIndex--;
      this.currentQuestionInSectionIndex = this.sections[this.currentSectionIndex].questions.length - 1;
    } else {
      return;
    }
    this.currentGlobalQuestionIndex = this.getGlobalIndex(this.currentSectionIndex, this.currentQuestionInSectionIndex);
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
    const formCtrl = this.responses.at(globalIndex);
    return formCtrl ? formCtrl.get('review')!.value : false;
  }

  isFirstQuestionOverall(): boolean {
    return this.currentSectionIndex === 0 && this.currentQuestionInSectionIndex === 0;
  }

  isLastQuestionOverall(): boolean {
    if (!this.sections || this.sections.length === 0) return true;
    const lastSectionIdx = this.sections.length - 1;
    const lastQuestionInSectionIdx = this.sections[lastSectionIdx].questions.length - 1;
    return this.currentSectionIndex === lastSectionIdx && this.currentQuestionInSectionIndex === lastQuestionInSectionIdx;
  }
  
  private processSections(sectionsFromServer: any[] | undefined): PlayerSection[] {
    if (!sectionsFromServer) return [];
    return sectionsFromServer.map(section => ({
      title: section.title,
      order: section.order,
      questions: (section.questions || []).map((originalQuestion: any): PlayerQuestion => {
        const translations = (originalQuestion.translations || []) as QuestionTranslation[];
        if (translations.length === 0) {
          translations.push({
            lang: this.defaultLanguage,
            questionText: originalQuestion.questionText || `Text for ${originalQuestion.question || originalQuestion._id} missing`,
            options: (originalQuestion.options || []).map((opt: any) => ({ text: opt.text, isCorrect: opt.isCorrect }))
          });
        }
        const initialDisplay = this.getTranslatedContentForQuestion(translations, this.currentLanguage);
        return {
          question: originalQuestion.question || originalQuestion._id,
          translations: translations,
          marks: originalQuestion.marks,
          type: originalQuestion.type,
          difficulty: originalQuestion.difficulty,
          questionHistory: originalQuestion.questionHistory,
          displayQuestionText: initialDisplay.questionText,
          displayOptions: initialDisplay.options,
          availableLanguages: translations.map(t => t.lang),
          originalLanguageForDisplay: initialDisplay.langUsed
        };
      })
    }));
  }

  private getTranslatedContentForQuestion(
    translations: QuestionTranslation[],
    targetLang: 'en' | 'hi'
  ): { questionText: string; options: QuestionOption[]; langUsed: 'en' | 'hi' } {
    let selectedTranslation = translations.find(t => t.lang === targetLang);
    let langUsed = targetLang;
    if (!selectedTranslation) {
      selectedTranslation = translations.find(t => t.lang === this.defaultLanguage) || translations[0];
      langUsed = selectedTranslation!.lang; // Added non-null assertion as translations[0] will exist if not empty
    }
    return {
      questionText: selectedTranslation!.questionText, // Added non-null assertion
      options: selectedTranslation!.options, // Added non-null assertion
      langUsed: langUsed
    };
  }

  changeLanguage(lang: 'en' | 'hi'): void {
    if (this.currentLanguage === lang) return;
    this.currentLanguage = lang;
    this.sections.forEach(section => {
      section.questions.forEach(question => {
        const newDisplayContent = this.getTranslatedContentForQuestion(question.translations, this.currentLanguage);
        question.displayQuestionText = newDisplayContent.questionText;
        question.displayOptions = newDisplayContent.options;
        question.originalLanguageForDisplay = newDisplayContent.langUsed;
      });
    });
    this.cd.detectChanges();
  }

  get currentQuestionDisplayData(): PlayerQuestion | undefined {
    if (this.sections && 
        this.sections[this.currentSectionIndex] &&
        this.sections[this.currentSectionIndex].questions[this.currentQuestionInSectionIndex]) {
      return this.sections[this.currentSectionIndex].questions[this.currentQuestionInSectionIndex]; // Corrected property name
    }
    return undefined;
  }

  private buildFormAndTimer(): void {
    const responsesFormArray = this.form.get('responses') as FormArray;
    responsesFormArray.clear(); 
    let globalQuestionCounter = 0;
    this.sections.forEach((sec, sIdx) => {
      sec.questions.forEach((q, qIdx) => {
        const savedResponse = (this.savedResponses && globalQuestionCounter < this.savedResponses.length) 
                              ? this.savedResponses[globalQuestionCounter] 
                              : undefined;
        let initialSelectedValue = '';
        if (savedResponse && savedResponse.selected && Array.isArray(savedResponse.selected) && savedResponse.selected.length > 0) {
          initialSelectedValue = savedResponse.selected[0]; 
        } else if (savedResponse && savedResponse.selected && typeof savedResponse.selected === 'string') {
            initialSelectedValue = savedResponse.selected;
        }
        const questionFormGroup = this.fb.group({
          question:      [q.question],
          selected:      [String(initialSelectedValue)], 
          review:        [savedResponse ? savedResponse.review || false : false],
          _sectionIndexDebug:  [sIdx],
          _questionIndexDebug: [qIdx]
        });
        responsesFormArray.push(questionFormGroup);
        globalQuestionCounter++;
      });
    });

    this.currentSectionIndex = 0;
    this.currentQuestionInSectionIndex = 0;
    if (this.sections.length > 0 && this.sections[0].questions.length > 0) {
         this.currentGlobalQuestionIndex = this.getGlobalIndex(0,0);
    } else {
        this.currentGlobalQuestionIndex = 0;
    }
   
    clearInterval(this.timerHandle);
    this.timerHandle = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        clearInterval(this.timerHandle);
        alert('Time is up!');
        this.submit();
      }
    }, 1000);
  }

  getQuestionStatus(sectionIdx: number, questionInSectionIdx: number): string {
    const globalIndex = this.getGlobalIndex(sectionIdx, questionInSectionIdx);
    const formCtrl = this.responses.at(globalIndex);
    if (formCtrl) {
      const isMarkedForReview = formCtrl.get('review')!.value;
      const selectedValue = formCtrl.get('selected')!.value;
      const isAnswered = selectedValue !== null && selectedValue !== undefined && String(selectedValue).trim() !== '';
      if (isMarkedForReview) {
        return this.QuestionStatus.MARKED_FOR_REVIEW;
      }
      if (isAnswered) {
        return this.QuestionStatus.ANSWERED;
      }
    }
    return this.QuestionStatus.UNANSWERED;
  }

  manualSave() {
    if (this.attemptId) {
      this.testSvc.saveProgress(this.attemptId, { responses: this.form.value.responses, timeLeft: this.timeLeft }).subscribe({
        next: () => {
          console.log('✔️ Manual save successful. TimeLeft:', this.timeLeft);
          alert('Progress Saved!');
        },
        error: (e: any) => {
          console.warn('Manual save failed', e);
          alert('Failed to save progress.');
        }
      });
    }
  }
}
