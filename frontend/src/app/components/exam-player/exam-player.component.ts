import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule }      from '@angular/common';
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
  sections: any[] = [];
  form!: FormGroup;
  timeLeft = 0;
  timerHandle!: any;
  currentQuestionIndex = 0;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private testSvc: TestService,
    private cd: ChangeDetectorRef    // ← inject this
  ) {
    // Initialize the form here
    this.form = this.fb.group({
      responses: this.fb.array([])
    });
  }

  ngOnInit() {
    this.seriesId = this.route.snapshot.paramMap.get('seriesId')!;
    this.testSvc.startTest(this.seriesId).subscribe({
      next: res => {
        console.log('startTest response:', res);
        console.log('Full sections payload:', JSON.stringify(res.sections, null, 2));
        this.attemptId = res.attemptId;
        this.duration  = res.duration;

        // use the actual sections your server sent (each has a .questions array)
        this.sections = res.sections ?? [];

        // now build the form & start timer
        this.buildFormAndTimer();
      },
      error: err => alert(err.error?.message || 'Failed to start test')
    });

    this.form.valueChanges
      .pipe(
        debounceTime(2000),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(vals => {
        this.testSvc.saveProgress(this.attemptId, vals).subscribe({
          next: () => console.log('Progress auto-saved'),
          error: err => console.warn('Auto-save failed', err)
        });
      });
  }

  // Typed getter for the responses FormArray
  get responses(): FormArray {
    return this.form.get('responses') as FormArray;
  }

  start() {
    this.testSvc.startTest(this.seriesId)
      .subscribe((res: StartTestResponse) => {
        this.attemptId = res.attemptId;
        this.duration  = res.duration;
        this.timeLeft  = this.duration * 60;    // ← reset the timer
        this.sections  = res.sections || [];

        // Rebuild the form now that we have questions
        this.form = this.fb.group({ responses: this.fb.array([]) });
        this.sections.forEach((sec: any, sIdx: number) =>
          sec.questions.forEach((q: any, qIdx: number) => {
            this.responses.push(
              this.fb.group({
                question: [q.question],
                selected: [''],          // single‐value selection
                review:   [false],
                sectionIndex: [sIdx],
                questionIndex: [qIdx]
              })
            );
          })
        );

        // Add a watcher to log changes to the form
        this.responses.controls.forEach((ctrl, i) => {
          ctrl.get('selected')!
            .valueChanges
            .subscribe(v => console.log(`Response[${i}].selected =`, v));
        });

        this.cd.detectChanges();       // ← force view refresh

        // Start the timer
        this.timerHandle = setInterval(() => {
          if (this.timeLeft <= 0) this.submit();
          this.timeLeft--;
        }, 1000);
      });
  }

  submit() {
    clearInterval(this.timerHandle);

    const payload = this.responses.controls.map(ctrl => {
      const qId = ctrl.get('question')!.value;
      const raw = ctrl.get('selected')!.value;
      let selectedArr: number[];

      if (Array.isArray(raw)) {
        // multi‐select checkbox scenario
        selectedArr = raw.map((v: string | number) => Number(v));
      } else if (typeof raw === 'string') {
        // comma‐string scenario (if you ever use <select multiple> or such)
        selectedArr = raw
          .split(',')
          .filter(x => x !== '')
          .map(x => Number(x));
      } else {
        // single radio selection (number)
        selectedArr = [Number(raw)];
      }

      return {
        question: qId,
        selected: selectedArr
      };
    });

    this.testSvc.submitAttempt(this.attemptId, { responses: payload }).subscribe({
      next: () => {
        alert('Submission successful!');
        this.router.navigate([`/review/${this.attemptId}`]);
      },
      error: err => alert(err.error?.message || 'Submission failed')
    });
  }

  formatTime(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // jump to a specific question
  goToQuestion(i: number) {
    this.currentQuestionIndex = i;
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

  private buildFormAndTimer() {
    // —— build the FormArray here ——
    this.form = this.fb.group({ responses: this.fb.array([]) });
    this.sections.forEach((sec: any, sIdx: number) =>
      sec.questions.forEach((q: any, qIdx: number) => {
        this.responses.push(
          this.fb.group({
            question:     [q.question],
            selected:     [''],        // or [] if multi-select
            review:       [false],
            sectionIndex: [sIdx],
            questionIndex:[qIdx]
          })
        );
      })
    );

    // —— start the timer here ——
    this.timeLeft   = this.duration * 60;
    this.timerHandle = setInterval(() => {
      this.timeLeft--;
      this.cd.detectChanges();
      if (this.timeLeft <= 0) {
        clearInterval(this.timerHandle);
        this.submit();  // or however you finalize
      }
    }, 1000);

    this.currentQuestionIndex = 0;
  }
}
