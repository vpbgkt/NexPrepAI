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
  // Make sections explicitly an array of objects with a questions array
  sections: { questions: { question: string }[] }[] = [];
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

    // 1️⃣ Try to resume an in-progress attempt
    this.testSvc.getProgress(this.seriesId).subscribe({
      next: progress => {
        if (progress.attemptId) {
          // Resume flow
          this.attemptId = progress.attemptId;
          this.duration  = progress.remainingTime ?? 0;
          this.sections  = progress.sections       ?? [];
          this.buildFormAndTimer();
          this.attachAutoSave();
        } else {
          // No progress → start new
          this.startNewTest();
        }
      },
      error: () => this.startNewTest()
    });
  }

  private startNewTest() {
    this.testSvc.startTest(this.seriesId).subscribe({
      next: (res: StartTestResponse) => {
        this.attemptId = res.attemptId;
        this.duration  = res.duration;
        this.sections  = res.sections     ?? [];
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

  private buildFormAndTimer(): void {
    // Rebuild form with the sections/questions
    this.form = this.fb.group({ responses: this.fb.array([]) });

    // Now sections is typed, and we annotate sec, sIdx, q, qIdx
    this.sections.forEach((sec: { questions: { question: string }[] }, sIdx: number) => {
      sec.questions.forEach((q: { question: string }, qIdx: number) => {
        this.responses.push(
          this.fb.group({
            question:      [q.question],
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
