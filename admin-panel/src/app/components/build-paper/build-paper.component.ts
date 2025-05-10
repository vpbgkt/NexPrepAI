import { Component, OnInit, OnDestroy } from '@angular/core'; // MODIFIED: Added OnDestroy
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, Subscription } from 'rxjs'; // ADDED: Subject, Subscription
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'; // ADDED: debounceTime, distinctUntilChanged

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

    // Debounce search input
    this.sections.controls.forEach((_, index) => this.setupSearchDebouncer(index));
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

  get sections(): FormArray {
    return this.seriesForm.get('sections') as FormArray;
  }

  addSection() {
    const newIndex = this.sections.length;
    this.sections.push(this.fb.group({
      title: ['', Validators.required],
      order: [newIndex + 1, Validators.required],
      questions: this.fb.array([])
    }));
    this.sectionSearchTerms.push('');
    this.sectionSearchResults.push([]);
    this.previewedQuestions.push([]);
    
    // Ensure arrays are ready for the new index before calling setupSearchDebouncer
    // which will assign to this.searchDebouncers[newIndex] and this.searchSubscriptions[newIndex]
    // If setupSearchDebouncer is called for an index not yet "prepared" in these arrays,
    // it might lead to issues if not handled carefully inside setupSearchDebouncer or here.
    // However, setupSearchDebouncer itself assigns new Subject/Subscription, so direct push isn't strictly needed here
    // if setupSearchDebouncer is robust. For safety, we can ensure the arrays are extended.
    this.searchDebouncers.length = Math.max(this.searchDebouncers.length, newIndex + 1);
    this.searchSubscriptions.length = Math.max(this.searchSubscriptions.length, newIndex + 1);

    this.setupSearchDebouncer(newIndex); // Setup debouncer for the new section
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
    // The [(ngModel)]="sectionSearchTerms[i]" already updates the term
    this.searchDebouncers[secIndex].next(this.sectionSearchTerms[secIndex]);
  }

  addQuestionFromSearchResults(secIndex: number, questionToAdd: Question) {
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
}
