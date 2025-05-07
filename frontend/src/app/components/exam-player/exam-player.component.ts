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
  sections: { 
    title: string, // Added title from backend
    order: number, // Added order from backend
    questions: { 
      question: string; // ID
      questionText: string; 
      options: { text: string; isCorrect?: boolean }[]; // isCorrect is optional, mostly for backend
      marks?: number; // Added from backend
      type?: string; // Added from backend
      difficulty?: string; // Added from backend
    }[] 
  }[] = [];
  form: FormGroup;
  timeLeft = 0; // This will store remaining duration in seconds
  timerHandle!: any;
  currentQuestionIndex = 0;
  hasSavedProgress: boolean = false;
  private savedResponses: any[] = [];

  // Properties to temporarily hold progress data if found
  private pendingAttemptId: string | undefined;
  private pendingTimeLeft: number = 0;
  private pendingSections: any[] = [];
  private pendingSavedResponses: any[] = [];

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

  goToQuestion(i: number) {
    if (i >= 0 && i < this.responses.length) {
      this.currentQuestionIndex = i;
    }
  }

  next() {
    if (this.currentQuestionIndex < this.responses.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  prev() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  // Method to process sections and questions from the server
  // Backend now sends more detailed section info, so this might be simpler
  private processSections(sectionsFromServer: any[] | undefined): { title: string, order: number, questions: { question: string; questionText: string; options: { text: string; isCorrect?: boolean }[], marks?:number, type?:string, difficulty?:string }[] }[] {
    if (!sectionsFromServer) {
      console.warn('processSections: sectionsFromServer is undefined or null');
      return [];
    }
    console.log('processSections input:', sectionsFromServer);
    return sectionsFromServer.map(section => {
      return {
        title: section.title, // Expect title from backend
        order: section.order, // Expect order from backend
        questions: (section.questions || []).map((originalQuestion: any) => {
          // The backend's `detailedSectionsForAttempt` should already have questionText and options
          return {
            question: originalQuestion.question || originalQuestion._id, // ID
            questionText: originalQuestion.questionText || `Text for ${originalQuestion.question || originalQuestion._id} missing`,
            options: (originalQuestion.options || []).map((opt: any) => ({ text: opt.text, isCorrect: opt.isCorrect })), // Expect options with text and isCorrect
            marks: originalQuestion.marks,
            type: originalQuestion.type,
            difficulty: originalQuestion.difficulty
          };
        })
      };
    });
  }

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
        }

        // Ensure the question ID logged here is the one from the current question `q` in the loop,
        // and the savedResponse is the one fetched by index.
        console.log(`FE: buildFormAndTimer - Q_Display_Index: ${globalQuestionCounter}, Q_ID_from_Section: ${q.question} - Matched_SavedResp_by_Index: ${JSON.stringify(savedResponse)} - InitialSelectedValue: '${initialSelectedValue}'`);

        const questionFormGroup = this.fb.group({
          question:      [q.question],
          selected:      [String(initialSelectedValue)], // Explicitly use String()
          review:        [savedResponse ? savedResponse.review || false : false],
          sectionIndex:  [sIdx],
          questionIndex: [qIdx]
        });
        responsesFormArray.push(questionFormGroup);
        globalQuestionCounter++; // Increment for the next question
      });
    });

    // Log value of a specific control after loop
    if (responsesFormArray.length > 0) {
      const firstSelectedControl = responsesFormArray.at(0)?.get('selected');
      console.log('FE: buildFormAndTimer - Value of first question\'s \'selected\' control after loop:', firstSelectedControl?.value, 'Type:', typeof firstSelectedControl?.value);
      if (responsesFormArray.length > 1) {
        const secondSelectedControl = responsesFormArray.at(1)?.get('selected');
        console.log('FE: buildFormAndTimer - Value of second question\'s \'selected\' control after loop:', secondSelectedControl?.value, 'Type:', typeof secondSelectedControl?.value);
      }
      if (responsesFormArray.length > 2) {
        const thirdSelectedControl = responsesFormArray.at(2)?.get('selected');
        console.log('FE: buildFormAndTimer - Value of third question\'s \'selected\' control after loop:', thirdSelectedControl?.value, 'Type:', typeof thirdSelectedControl?.value);
      }
      if (responsesFormArray.length > 3) {
        const fourthSelectedControl = responsesFormArray.at(3)?.get('selected');
        console.log('FE: buildFormAndTimer - Value of fourth question\'s \'selected\' control after loop:', fourthSelectedControl?.value, 'Type:', typeof fourthSelectedControl?.value);
      }
    }

    // Force change detection
    this.cd.detectChanges(); // <--- ADD THIS

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

    // Determine initial currentQuestionIndex
    // If resuming, try to find the first unanswered question or default to 0
    if (this.savedResponses.length > 0) {
        let firstUnanswered = -1;
        for(let i=0; i < responsesFormArray.controls.length; i++) { 
            const savedResp = (this.savedResponses && i < this.savedResponses.length) ? this.savedResponses[i] : undefined;
            if (!savedResp || !savedResp.selected || (Array.isArray(savedResp.selected) && savedResp.selected.length > 0 && savedResp.selected[0] === '')) { 
                firstUnanswered = i;
                break;
            }
        }
        this.currentQuestionIndex = firstUnanswered !== -1 ? firstUnanswered : 0;
    } else {
        this.currentQuestionIndex = 0;
    }
    console.log('Form built. Initial currentQuestionIndex:', this.currentQuestionIndex);
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
    this.testSvc
      .saveProgress(this.attemptId, { responses: this.form.value.responses, timeLeft: this.timeLeft })
      .subscribe({
        next: () => alert('✔️ Progress saved'),
        error: err => {
          console.warn('Manual save failed', err);
          alert('❌ Save failed');
        }
      });
  }
}
