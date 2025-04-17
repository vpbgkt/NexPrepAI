import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize } from 'rxjs';
import { QuestionService } from '../../services/question.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-question',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-question.component.html',
  styleUrls: ['./add-question.component.scss'],
})
export class AddQuestionComponent implements OnInit {
  private questionService = inject(QuestionService);
  private router = inject(Router);

  question = {
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

  isLoading = false;     // ← loading flag

  ngOnInit(): void {
    this.fetchBranches();
  }

  fetchBranches() {
    this.questionService.getBranches().subscribe({
      next: (data) => {
        console.log('Branches payload:', data);
        this.branches = Array.isArray(data) ? data : data.branches || [];
      },
      error: (err) => console.error('Error fetching branches:', err)
    });
  }

  onBranchChange(branchId: string) {
    this.question.branchId = branchId;
    this.subjects = [];
    this.topics = [];
    this.subtopics = [];
    this.question.subjectId = '';
    this.question.topicId = '';
    this.question.subtopicId = '';

    this.questionService.getSubjects(branchId).subscribe((data) => {
      this.subjects = data.subjects || data;
    });
  }

  onSubjectChange(subjectId: string) {
    this.question.subjectId = subjectId;
    this.topics = [];
    this.subtopics = [];
    this.question.topicId = '';
    this.question.subtopicId = '';

    this.questionService.getTopics(subjectId).subscribe((data) => {
      this.topics = data.topics || data;
    });
  }

  onTopicChange(topicId: string) {
    this.question.topicId = topicId;
    this.subtopics = [];
    this.question.subtopicId = '';

    this.questionService.getSubtopics(topicId).subscribe((data) => {
      this.subtopics = data.subtopics || data;
    });
  }

  onSubtopicChange(subtopicId: string) {
    this.question.subtopicId = subtopicId;
  }

  addOption() {
    this.question.options.push({ text: '', isCorrect: false });
  }

  removeOption(index: number) {
    if (this.question.options.length > 2) {
      this.question.options.splice(index, 1);
    }
  }

  addQuestion(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();  // trigger validation messages
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
    this.questionService.addQuestion(payload)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: () => {
          alert('Question submitted successfully!');
          form.resetForm();
        },
        error: () => {
          alert('Error submitting question.');
        }
      });
  }

  /** Navigate to Add Branch page */
  goToAddBranch() {
    this.router.navigate(['/branches/new']);
  }
}
