import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuestionService } from '../../services/question.service';
import { Question, PopulatedHierarchyField, Translation, Option } from '../../models/question.model'; // MODIFIED: Ensure all necessary types are imported
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-question-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './question-list.component.html',
  styleUrls: ['./question-list.component.scss']
})
export class QuestionListComponent implements OnInit {
  questions: Question[] = [];
  branches: any[] = [];
  subjects: any[] = [];
  topics: any[] = [];
  subtopics: any[] = [];

  filters = {
    branch: '',
    subject: '',
    topic: '',
    subtopic: '',
    difficulty: ''
  };

  selectedBranch: string = '';
  selectedSubject: string = '';
  selectedTopic: string = '';
  selectedSubtopic: string = '';
  selectedDifficulty: string = '';

  constructor(private questionService: QuestionService, private router: Router) {}

  ngOnInit(): void {
    this.loadBranches();
    this.loadQuestions();
  }

  loadBranches(): void {
    this.questionService.getBranches().subscribe({
      next: (res: any) => {
        this.branches = res.branches || res;
      },
      error: (err: any) => {
        console.error('Failed to load branches:', err);
      }
    });
  }

  onBranchChange(): void {
    this.subjects = [];
    this.topics = [];
    this.subtopics = [];

    if (this.filters.branch) {
      this.questionService.getSubjects(this.filters.branch).subscribe({
        next: (res: any) => {
          this.subjects = res.subjects || res;
        },
        error: (err: any) => {
          console.error('Failed to load subjects:', err);
        }
      });
    }
  }

  onSubjectChange(): void {
    this.topics = [];
    this.subtopics = [];

    if (this.filters.subject) {
      this.questionService.getTopics(this.filters.subject).subscribe({
        next: (res: any) => {
          this.topics = res.topics || res;
        },
        error: (err: any) => {
          console.error('Failed to load topics:', err);
        }
      });
    }
  }

  onTopicChange(): void {
    this.subtopics = [];

    if (this.filters.topic) {
      this.questionService.getSubtopics(this.filters.topic).subscribe({
        next: (res: any) => {
          this.subtopics = res.subtopics || res;
        },
        error: (err: any) => {
          console.error('Failed to load subtopics:', err);
        }
      });
    }
  }

  applyFilters(): void {
    if (!this.filters.branch) {
      alert('Please select at least a Branch to filter.');
      return;
    }

    this.questionService.filterQuestions(this.filters).subscribe({
      next: (res: any) => {
        this.questions = res;
      },
      error: (err: any) => {
        console.error('Failed to fetch filtered questions:', err);
      }
    });
  }

  resetFilters(): void {
    this.selectedBranch = '';
    this.selectedSubject = '';
    this.selectedTopic = '';
    this.selectedSubtopic = '';
    this.selectedDifficulty = '';
    this.loadQuestions(); // reload unfiltered questions
  }

  loadQuestions(): void {
    this.questionService.getQuestions().subscribe((data) => {
      this.questions = data;
    });
  }

  // ADDED: Helper to get string ID
  getIdString(idValue: string | { $oid: string } | PopulatedHierarchyField | undefined): string {
    if (idValue === undefined || idValue === null) {
      return '';
    }

    if (typeof idValue === 'string') {
      return idValue;
    }

    // Check if idValue is an object (could be { $oid: string } or PopulatedHierarchyField)
    if (typeof idValue === 'object') {
      // Case 1: Direct $oid object (e.g., { $oid: "someId" })
      if ('$oid' in idValue && typeof (idValue as { $oid: string }).$oid === 'string') {
        return (idValue as { $oid: string }).$oid;
      }

      // Case 2: PopulatedHierarchyField (e.g., { _id: "someId" | { $oid: "someId" }, name: "Some Name" })
      // We need to extract the actual ID from its _id property.
      if ('_id' in idValue && idValue._id && 'name' in idValue) { // Characteristic properties of PopulatedHierarchyField
        const nestedId = (idValue as PopulatedHierarchyField)._id;
        if (typeof nestedId === 'string') {
          return nestedId;
        }
        if (nestedId && typeof nestedId === 'object' && '$oid' in nestedId && typeof (nestedId as { $oid: string }).$oid === 'string') {
          return (nestedId as { $oid: string }).$oid;
        }
      }
    }

    // Fallback for unhandled cases or if it's not a recognized ID format.
    // console.warn('[QuestionListComponent] getIdString: Unhandled ID format for value:', idValue);
    return ''; // Return empty string to avoid display issues like [object Object]
  }

  // ADDED: Helper to get name from populated field
  getPopulatedFieldName(field: string | { $oid: string } | PopulatedHierarchyField | undefined): string | null {
    // Check if it's a PopulatedHierarchyField and has a name
    if (field && typeof field === 'object' && '_id' in field && 'name' in field && typeof (field as PopulatedHierarchyField).name === 'string') {
      return (field as PopulatedHierarchyField).name;
    }
    return null;
  }

  onEdit(id: string | { $oid: string }): void {
    this.router.navigate(['/questions', this.getIdString(id), 'edit']);
  }

  onDelete(id: string | { $oid: string }): void {
    if (confirm('Are you sure you want to delete this question?')) {
      this.questionService.deleteQuestion(this.getIdString(id)).subscribe(() => {
        this.loadQuestions(); // refresh list after deletion
      });
    }
  }
}
