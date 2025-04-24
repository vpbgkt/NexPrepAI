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
    // Removed the getSeries(...) call as the layout comes with startTest
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

    console.log('FORM VALUE AT SUBMIT:', this.form.value);

    const payload = this.responses.value.map((r: any) => ({
      question: r.question,
      selected: r.selected ? [r.selected] : []
    }));

    console.log('PAYLOAD:', payload);

    this.testSvc
      .submitAttempt(this.attemptId, payload)
      .subscribe(() => this.router.navigate(['/review', this.attemptId]));
  }

  formatTime(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}
