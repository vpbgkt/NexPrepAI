import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HierarchyService, Branch, Subject, Topic, Subtopic } from '../../services/hierarchy.service';
import { TestSeriesService, TestSeries } from '../../services/test-series.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-create-test-series',
  templateUrl: './create-test-series.component.html',
  imports: [ CommonModule, ReactiveFormsModule, RouterModule ]
})
export class CreateTestSeriesComponent implements OnInit {
  form: FormGroup;
  branches: Branch[]   = [];
  subjects: Subject[]  = [];
  topics: Topic[]      = [];
  subtopics: Subtopic[]= [];

  constructor(
    private fb: FormBuilder,
    private hierarchy: HierarchyService,
    private tsService: TestSeriesService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      branchId: ['', Validators.required],
      subjectId: [''],
      topicId: [''],
      subtopicId: [''],
      questionCount: [10, [Validators.required, Validators.min(1)]],
      durationMinutes: [30, [Validators.required, Validators.min(1)]],
      totalMarks: [100, [Validators.required, Validators.min(1)]],
      negativeMarks: [0],
    });
  }

  ngOnInit(): void {
    // 1. Load branches on init
    this.hierarchy.getBranches().subscribe(bs => this.branches = bs);

    // 2. When branch changes → load subjects, clear lower
    this.form.get('branchId')!.valueChanges.subscribe(branchId => {
      this.subjects = [];
      this.topics   = [];
      this.subtopics= [];
      this.form.patchValue({ subjectId: '', topicId: '', subtopicId: '' });
      if (branchId) {
        this.hierarchy.getSubjects(branchId).subscribe(s => this.subjects = s);
      }
    });

    // 3. When subject changes → load topics, clear lower
    this.form.get('subjectId')!.valueChanges.subscribe(subjId => {
      this.topics    = [];
      this.subtopics = [];
      this.form.patchValue({ topicId: '', subtopicId: '' });
      if (subjId) {
        this.hierarchy.getTopics(subjId).subscribe(t => this.topics = t);
      }
    });

    // 4. When topic changes → load subtopics
    this.form.get('topicId')!.valueChanges.subscribe(topicId => {
      this.subtopics = [];
      this.form.patchValue({ subtopicId: '' });
      if (topicId) {
        this.hierarchy.getSubtopics(topicId).subscribe(st => this.subtopics = st);
      }
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.tsService.create(this.form.value as TestSeries)
      .subscribe(() => {
        alert('Test series created!');
        this.form.reset();
      });
  }
}
