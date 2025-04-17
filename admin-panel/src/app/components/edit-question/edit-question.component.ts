import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { QuestionService } from '../../services/question.service';

@Component({
  selector: 'app-edit-question',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-question.component.html',
  styleUrls: ['./edit-question.component.scss'],
})
export class EditQuestionComponent implements OnInit {
  private questionService = inject(QuestionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  id!: string;
  question: any = {
    questionText: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
    difficulty: '',
    branchId: '',
    subjectId: '',
    topicId: '',
    subtopicId: '',
    explanation: ''
  };

  branches: any[] = [];
  subjects: any[] = [];
  topics: any[] = [];
  subtopics: any[] = [];

  isLoading = false;

  ngOnInit() {
    this.fetchBranches();
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.questionService.getQuestionById(this.id).subscribe({
      next: data => {
        this.question = {
          questionText: data.questionText,
          options: data.options,
          difficulty: data.difficulty,
          branchId: data.branch._id || data.branch,
          subjectId: data.subject._id || data.subject,
          topicId: data.topic._id || data.topic,
          subtopicId: data.subtopic._id || data.subtopic,
          explanation: data.explanation || ''
        };
        this.fetchSubjects(this.question.branchId);
        this.fetchTopics(this.question.subjectId);
        this.fetchSubtopics(this.question.topicId);
      },
      error: err => console.error('Error loading question:', err)
    });
  }

  fetchBranches() {
    this.questionService.getBranches().subscribe({
      next: data => this.branches = Array.isArray(data) ? data : data.branches || [],
      error: err => console.error('Error fetching branches:', err)
    });
  }

  fetchSubjects(branchId: string) {
    this.questionService.getSubjects(branchId).subscribe({
      next: data => this.subjects = data.subjects || data,
      error: err => console.error('Error fetching subjects:', err)
    });
  }

  fetchTopics(subjectId: string) {
    this.questionService.getTopics(subjectId).subscribe({
      next: data => this.topics = data.topics || data,
      error: err => console.error('Error fetching topics:', err)
    });
  }

  fetchSubtopics(topicId: string) {
    this.questionService.getSubtopics(topicId).subscribe({
      next: data => this.subtopics = data.subtopics || data,
      error: err => console.error('Error fetching subtopics:', err)
    });
  }

  onBranchChange(branchId: string) {
    this.question.branchId = branchId;
    this.question.subjectId = '';
    this.question.topicId = '';
    this.question.subtopicId = '';
    this.subjects = [];
    this.topics = [];
    this.subtopics = [];
    this.fetchSubjects(branchId);
  }

  onSubjectChange(subjectId: string) {
    this.question.subjectId = subjectId;
    this.question.topicId = '';
    this.question.subtopicId = '';
    this.topics = [];
    this.subtopics = [];
    this.fetchTopics(subjectId);
  }

  onTopicChange(topicId: string) {
    this.question.topicId = topicId;
    this.question.subtopicId = '';
    this.subtopics = [];
    this.fetchSubtopics(topicId);
  }

  onSubtopicChange(subtopicId: string) {
    this.question.subtopicId = subtopicId;
  }

  save(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const payload = {
      questionText: this.question.questionText,
      options: this.question.options,
      difficulty: this.question.difficulty,
      branch: this.question.branchId,
      subject: this.question.subjectId,
      topic: this.question.topicId,
      subtopic: this.question.subtopicId,
      explanation: this.question.explanation
    };
    this.isLoading = true;
    this.questionService.updateQuestion(this.id, payload)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: () => {
          alert('Question updated successfully!');
          this.router.navigate(['/questions']);
        },
        error: () => alert('Failed to update.')
      });
  }

  cancel() {
    this.router.navigate(['/questions']);
  }

  /** Add a new blank option */
  addOption() {
    this.question.options.push({ text: '', isCorrect: false });
  }

  /** Remove an option, leave at least two */
  removeOption(index: number) {
    if (this.question.options.length > 2) {
      this.question.options.splice(index, 1);
    }
  }
}
