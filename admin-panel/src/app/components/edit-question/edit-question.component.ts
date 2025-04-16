import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    options: [{ text: '', isCorrect: false },{ text: '', isCorrect: false },
              { text: '', isCorrect: false },{ text: '', isCorrect: false }],
    difficulty: '',
    branchId: '',
    subjectId: '',
    topicId: '',
    subtopicId: '',
    explanation: ''
  };

  // Hierarchy lists
  branches: any[] = [];
  subjects: any[] = [];
  topics: any[] = [];
  subtopics: any[] = [];

  ngOnInit() {
    // 1) Load all branches
    this.fetchBranches();

    // 2) Get the question ID from the route
    this.id = this.route.snapshot.paramMap.get('id')!;

    // 3) Fetch the question data
    this.questionService.getQuestionById(this.id).subscribe({
      next: data => {
        // Prefill the form values
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

        // 4) Load dependent dropdowns in order
        this.fetchSubjects(this.question.branchId);
        this.fetchTopics(this.question.subjectId);
        this.fetchSubtopics(this.question.topicId);
      },
      error: err => console.error('Error loading question:', err)
    });
  }

  // Fetch all branches
  fetchBranches() {
    this.questionService.getBranches().subscribe({
      next: data => this.branches = Array.isArray(data) ? data : data.branches || [],
      error: err => console.error('Error fetching branches:', err)
    });
  }

  // When branch changes (or on init), load subjects
  fetchSubjects(branchId: string) {
    this.questionService.getSubjects(branchId).subscribe({
      next: data => this.subjects = data.subjects || data,
      error: err => console.error('Error fetching subjects:', err)
    });
  }

  // When subject changes, load topics
  fetchTopics(subjectId: string) {
    this.questionService.getTopics(subjectId).subscribe({
      next: data => this.topics = data.topics || data,
      error: err => console.error('Error fetching topics:', err)
    });
  }

  // When topic changes, load subtopics
  fetchSubtopics(topicId: string) {
    this.questionService.getSubtopics(topicId).subscribe({
      next: data => this.subtopics = data.subtopics || data,
      error: err => console.error('Error fetching subtopics:', err)
    });
  }

  // Handlers for user changing dropdowns
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

  save() {
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
    this.questionService.updateQuestion(this.id, payload).subscribe({
      next: () => {
        alert('Question updated!');
        this.router.navigate(['/questions']);
      },
      error: err => {
        console.error('Update failed:', err);
        alert('Failed to update.');
      }
    });
  }

  cancel() {
    this.router.navigate(['/questions']);
  }
}
