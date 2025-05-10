import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';import { CommonModule } from '@angular/common';

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

@Component({
  selector: 'app-build-paper',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './build-paper.component.html',
  styleUrls: ['./build-paper.component.scss']
})
export class BuildPaperComponent implements OnInit {
  seriesForm!: FormGroup;
  questionsList: Question[] = [];
  families: ExamFamily[] = [];
  streams:  ExamStream[] = [];
  papers:   ExamPaper[] = [];
  shifts:   ExamShift[] = [];
  currentYear: number = new Date().getFullYear();
  previewedQuestions: any[][] = [];

  constructor(
    private fb: FormBuilder,
    private tsService: TestSeriesService,
    private qService: QuestionService,
    private efService: ExamFamilyService,
    private streamService: ExamStreamService,
    private paperService: ExamPaperService,
    private shiftService: ExamShiftService
  ) {}

  ngOnInit(): void {
    // Rebuilt FormGroup to remove negativeMark and examBody
    this.seriesForm = this.fb.group({
      title:     ['', Validators.required],
      duration:  [60, Validators.required],
      type:      ['practice', Validators.required],
      maxAttempts: [5, [Validators.required, Validators.min(1)]], // ★ ADD
      year:      [this.currentYear, Validators.required],
      startAt:   [null],
      endAt:     [null],
      family:    ['', Validators.required],
      stream:    ['', Validators.required],
      paper:     ['', Validators.required],
      shift:     ['', Validators.required],
      sections:  this.fb.array([])
    });

    // Fetch all families
    this.efService.getAll().subscribe(f => {
      console.log('🗂️ Fetched families:', f);
      this.families = f;
    });

    // When family changes, load streams and reset dependent fields
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

      if (familyId && String(familyId).trim() !== '') { // Ensure familyId is not null, undefined, or empty string
        console.log(`[BuildPaperComponent] Fetching streams for familyId: "${familyId}"`);
        this.streamService.getByFamily(familyId).subscribe({
          next: streamsData => {
            console.log('[BuildPaperComponent] Raw streams data received from service:', JSON.stringify(streamsData, null, 2));
            if (Array.isArray(streamsData)) {
              this.streams = streamsData;
              console.log(`[BuildPaperComponent] this.streams populated. Count: ${this.streams.length}. First item (if any):`, this.streams.length > 0 ? this.streams[0] : 'empty');
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
    });

    // When stream changes, load papers
    this.seriesForm.get('stream')!.valueChanges.subscribe(sid => {
      this.papers = [];
      this.shifts = [];
      if (sid) {
        this.paperService.getByStream(sid)
          .subscribe(p => this.papers = p);
      }
    });

    // When paper changes, load shifts
    this.seriesForm.get('paper')!.valueChanges.subscribe(pid => {
      this.shifts = [];
      if (pid) {
        this.shiftService.getByPaper(pid)
          .subscribe(v => this.shifts = v);
      }
    });

    // Load your question bank
    this.qService.getAll().subscribe(q => this.questionsList = q);
  }

  get sections(): FormArray {
    return this.seriesForm.get('sections') as FormArray;
  }

  addSection() {
    this.sections.push(this.fb.group({
      title: ['', Validators.required],
      order: [this.sections.length + 1, Validators.required],
      questions: this.fb.array([])
    }));
  }

  removeSection(i: number) {
    this.sections.removeAt(i);
  }

  getQuestions(secIndex: number): FormArray {
    return this.sections.at(secIndex).get('questions') as FormArray;
  }

  addQuestion(secIndex: number) {
    const qArray = this.getQuestions(secIndex);
    const newIndex = qArray.length;
    qArray.push(this.fb.group({
      question:       ['', Validators.required],
      marks:          [1, [Validators.required, Validators.min(0)]],
      negativeMarks:  [0, [Validators.required, Validators.min(0)]]
    }));
    // ensure previewedQuestions[secIndex] exists, then clear this slot
    this.previewedQuestions[secIndex] = this.previewedQuestions[secIndex] || [];
    this.previewedQuestions[secIndex][newIndex] = null;
  }

  removeQuestion(secIndex: number, qIndex: number) {
    this.getQuestions(secIndex).removeAt(qIndex);
    // remove the preview for that index so later additions don't resurrect it
    this.previewedQuestions[secIndex]?.splice(qIndex, 1);
  }

  get computedTotal(): number {
    return this.sections.controls.reduce((secSum, secCtrl) => {
      const qArr = secCtrl.get('questions') as FormArray;
      return secSum + qArr.controls.reduce((qSum, qCtrl) => qSum + (qCtrl.get('marks')!.value || 0), 0);
    }, 0);
  }

  importCsv(event: Event, secIndex: number) {
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
    if (!id || id.length !== 24) return;
    this.qService.getQuestionById(id).subscribe({
      next: question => {
        // ensure nested arrays exist
        this.previewedQuestions[secIndex] = this.previewedQuestions[secIndex] || [];
        this.previewedQuestions[secIndex][qIndex] = question;
      },
      error: () => {
        this.previewedQuestions[secIndex] = this.previewedQuestions[secIndex] || [];
        this.previewedQuestions[secIndex][qIndex] = { questionText: 'Not found' };
      }
    });
  }

  onSubmit() {
    this.tsService.create(this.seriesForm.value as Partial<TestSeries>)
      .subscribe(
        (res: any) => { alert('Test Series created!'); },
        (err: any) => { alert('Creation failed: ' + err.message); }
      );
  }

  onFamilyChange(familyId: string) {
    this.streams = []; this.papers = []; this.shifts = [];
    this.streamService.getByFamily(familyId).subscribe(list => this.streams = list);
  }

  onStreamChange(streamId: string) {
    this.papers = []; this.shifts = [];
    this.paperService.getByStream(streamId).subscribe(list => this.papers = list);
  }

  onPaperChange(paperId: string) {
    this.shifts = [];
    this.shiftService.getByPaper(paperId).subscribe(list => this.shifts = list);
  }

  onShiftChange(shiftId: string) {
    // if you need to do anything when shift changes, handle it here
  }
}
