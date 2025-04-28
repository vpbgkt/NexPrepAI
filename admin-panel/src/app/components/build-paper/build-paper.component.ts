import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';import { CommonModule } from '@angular/common';

import { TestSeriesService, TestSeries } from '../../services/test-series.service';
import { ExamTypeService } from '../../services/exam-type.service';
import { QuestionService } from '../../services/question.service';
import { Question } from '../../models/question.model';

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
  examTypes: any[] = [];
  questionsList: Question[] = [];

  constructor(
    private fb: FormBuilder,
    private tsService: TestSeriesService,
    private etService: ExamTypeService,
    private qService: QuestionService
  ) {}

  ngOnInit(): void {
    this.seriesForm = this.fb.group({
      title: ['', Validators.required],
      examType: ['', Validators.required],
      duration: [60, Validators.required],
      totalMarks: [0, Validators.required],
      negativeMarking: [0],
      sections: this.fb.array([])
    });

    // Fetch exam types & questions
    this.etService.getAll().subscribe((list: any[]) => this.examTypes = list);
    this.qService.getAll().subscribe((list: Question[]) => this.questionsList = list);
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
    this.getQuestions(secIndex).push(this.fb.group({
      question: ['', Validators.required],
      marks:    [1, [Validators.required, Validators.min(1)]]
    }));
  }

  removeQuestion(secIndex: number, qIndex: number) {
    this.getQuestions(secIndex).removeAt(qIndex);
  }

  onSubmit() {
    this.tsService.create(this.seriesForm.value as Partial<TestSeries>)
      .subscribe(
        (res: any) => { alert('Test Series created!'); },
        (err: any) => { alert('Creation failed: ' + err.message); }
      );
  }
}
