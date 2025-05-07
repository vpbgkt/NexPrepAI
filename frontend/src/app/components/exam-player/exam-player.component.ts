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
  attemptId!: string;
  duration!: number;
  // Updated sections type definition
  sections: { questions: { question: string; questionText: string; options: { text: string }[] }[] }[] = [];
  form: FormGroup;
  timeLeft = 0;
  timerHandle!: any;
  currentQuestionIndex = 0;

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

    this.testSvc.getProgress(this.seriesId).subscribe({
      next: progress => {
        if (progress.attemptId) {
          this.attemptId = progress.attemptId;
          this.duration  = progress.remainingTime ?? 0;
          this.sections  = this.processSections(progress.sections); // Use processSections
          this.buildFormAndTimer();
          this.attachAutoSave();
        } else {
          // Don't automatically start new test; wait for user to click "Start Exam"
          // this.startNewTest(); // Removed this line
        }
      },
      error: () => {
        // Don't automatically start new test on error either
        // this.startNewTest(); // Removed this line
        console.error('Error fetching progress. User may need to manually start the test.');
      }
    });
  }

  // Public start method for the template
  start(): void {
    this.startNewTest();
  }

  private startNewTest() {
    this.testSvc.startTest(this.seriesId).subscribe({
      next: (res: StartTestResponse) => {
        this.attemptId = res.attemptId;
        this.duration  = res.duration;
        this.sections  = this.processSections(res.sections); // Use processSections
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
        this.testSvc.saveProgress(this.attemptId, vals).subscribe({
          next: () => console.log('✔️ Auto-saved'),
          error: e => console.warn('Auto-save failed', e)
        });
      });
  }

  // Convenient getter for FormArray
  get responses(): FormArray {
    return this.form.get('responses') as FormArray;
  }

  submit() {
    clearInterval(this.timerHandle);

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
  private processSections(sectionsFromServer: any[] | undefined): { questions: { question: string; questionText: string; options: { text: string }[] }[] }[] {
    if (!sectionsFromServer) {
      return [];
    }
    return sectionsFromServer.map(section => {
      return {
        ...section, // Preserves other section properties
        questions: section.questions.map((originalQuestion: any) => {
          const questionId = originalQuestion.question || originalQuestion._id;
          let displayText = `Question text for ${questionId} not found`;
          let displayOptions: { text: string }[] = [];

          if (originalQuestion.translations && originalQuestion.translations.length > 0) {
            const firstTranslation = originalQuestion.translations[0];
            if (firstTranslation.questionText) {
              displayText = firstTranslation.questionText;
            }
            if (firstTranslation.options) {
              displayOptions = firstTranslation.options.map((opt: any) => ({ text: opt.text })).filter((opt: any) => opt.text);
            }
          } else if (originalQuestion.questionText && originalQuestion.questionText !== questionId) {
            // Fallback if translations are missing but originalQuestion.questionText seems valid
            displayText = originalQuestion.questionText;
            if (originalQuestion.options) {
              displayOptions = originalQuestion.options.map((opt: any) => ({ text: opt.text })).filter((opt: any) => opt.text);
            }
          }

          return {
            question: questionId,       // This is the ID
            questionText: displayText,  // This is the text to display
            options: displayOptions     // These are the options to display
          };
        })
      };
    });
  }

  private buildFormAndTimer(): void {
    // Rebuild form with the sections/questions
    this.form = this.fb.group({ responses: this.fb.array([]) });

    // Now sections is typed, and we annotate sec, sIdx, q, qIdx
    this.sections.forEach((sec, sIdx) => {
      sec.questions.forEach((q, qIdx) => {
        this.responses.push(
          this.fb.group({
            question:      [q.question], // Store the question ID
            selected:      [''],
            review:        [false],
            sectionIndex:  [sIdx],
            questionIndex: [qIdx]
          })
        );
      });
    });

    // Initialize timer
    this.timeLeft = this.duration * 60;
    this.timerHandle = setInterval(() => {
      this.timeLeft--;
      this.cd.detectChanges();
      if (this.timeLeft <= 0) {
        clearInterval(this.timerHandle);
        this.submit();
      }
    }, 1000);

    this.currentQuestionIndex = 0;
  }

  /**
   * Manually save the current form state.
   */
  manualSave() {
    if (!this.attemptId) return;
    this.testSvc
      .saveProgress(this.attemptId, this.form.value)
      .subscribe({
        next: () => alert('✔️ Progress saved'),
        error: err => {
          console.warn('Manual save failed', err);
          alert('❌ Save failed');
        }
      });
  }
}
