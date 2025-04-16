import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Question } from '../../models/question.model';
import { QuestionService } from '../../services/question.service';

@Component({
  selector: 'app-add-question',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-question.component.html',
  styleUrls: ['./add-question.component.scss'],
})
export class AddQuestionComponent implements OnInit {
  questionService = inject(QuestionService);

  question: Question = {
    questionText: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
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

  ngOnInit(): void {
    this.questionService.getBranches().subscribe((data) => {
      this.branches = data.branches || data;
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

  addQuestion() {
    if (
      !this.question.questionText ||
      this.question.options.some((o) => !o.text) ||
      !this.question.difficulty ||
      !this.question.branchId ||
      !this.question.subjectId ||
      !this.question.topicId
    ) {
      alert('Please fill out all fields.');
      return;
    }

    this.questionService.addQuestion(this.question).subscribe({
      next: (res) => {
        alert('Question submitted successfully!');
        console.log('Submitted:', res);
        // Reset form
        this.question = {
          questionText: '',
          options: [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
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
      },
      error: (err) => {
        alert('Error submitting question.');
        console.error(err);
      }
    });
  }
}
