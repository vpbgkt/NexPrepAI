import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuestionService, PaginatedQuestionsResponse } from '../../services/question.service'; // MODIFIED: Import PaginatedQuestionsResponse
import { Question, PopulatedHierarchyField, Translation, Option as QuestionOption } from '../../models/question.model'; // MODIFIED: Ensure all necessary types are imported
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// ADDED: Interface for questions with display properties
interface DisplayQuestion extends Question {
  displayQuestionText: string;
}

@Component({
  selector: 'app-question-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './question-list.component.html',
  styleUrls: ['./question-list.component.scss']
})
export class QuestionListComponent implements OnInit {
  questions: DisplayQuestion[] = []; // MODIFIED: Use DisplayQuestion interface
  branches: any[] = [];
  subjects: any[] = [];
  topics: any[] = [];
  subtopics: any[] = [];

  // Reverted to string arrays as enums are not in the model file as expected
  questionTypes: string[] = ['MCQ', 'SA', 'LA', 'FITB', 'Matrix']; 
  questionStatuses: string[] = ['Draft', 'Published', 'Archived', 'Pending Review']; 
  difficultyLevels: string[] = ['Easy', 'Medium', 'Hard', 'Very Hard'];

  filters = {
    branch: '',
    subject: '',
    topic: '',
    subtopic: '',
    difficulty: '',
    type: '',
    status: '',
    searchTerm: '' // ADDED: For text search
  };

  // ADDED: Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 15;
  totalQuestions: number = 0;
  totalPages: number = 0;

  constructor(private questionService: QuestionService, private router: Router) {}

  ngOnInit(): void {
    this.loadBranches();
    this.loadQuestions(); // Load initial set of questions
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
    this.filters.subject = '';
    this.filters.topic = '';
    this.filters.subtopic = '';

    if (this.filters.branch) {
      this.questionService.getSubjects(this.filters.branch).subscribe({
        next: (res: any) => {
          this.subjects = res.subjects || res;
        },
        error: (err: any) => {
          console.error('Failed to load subjects:', err);
        }
      });
    } else {
      this.applyFilters(); // Apply filters if branch is cleared
    }
  }

  onSubjectChange(): void {
    this.topics = [];
    this.subtopics = [];
    this.filters.topic = '';
    this.filters.subtopic = '';

    if (this.filters.subject) {
      this.questionService.getTopics(this.filters.subject).subscribe({
        next: (res: any) => {
          this.topics = res.topics || res;
        },
        error: (err: any) => {
          console.error('Failed to load topics:', err);
        }
      });
    } else {
       this.applyFilters(); // Apply filters if subject is cleared
    }
  }

  onTopicChange(): void {
    this.subtopics = [];
    this.filters.subtopic = '';

    if (this.filters.topic) {
      this.questionService.getSubtopics(this.filters.topic).subscribe({
        next: (res: any) => {
          this.subtopics = res.subtopics || res;
        },
        error: (err: any) => {
          console.error('Failed to load subtopics:', err);
        }
      });
    } else {
      this.applyFilters(); // Apply filters if topic is cleared
    }
  }

  // ADDED: Method to handle changes in subtopic, difficulty, type, or status filters
  onFilterChange(): void {
    this.currentPage = 1; // Reset to first page when filters change
    this.applyFilters();
  }

  applyFilters(): void {
    const effectiveFilters = {
      ...this.filters,
      page: this.currentPage,
      limit: this.itemsPerPage
    };
    this.questionService.filterQuestions(effectiveFilters).subscribe({
      next: (res: PaginatedQuestionsResponse) => {
        this.questions = res.questions.map(q => ({
          ...q,
          // displayQuestionText is still useful for the template
          displayQuestionText: this.getPrimaryTranslation(q)?.questionText || 'N/A' 
        })) as DisplayQuestion[]; // MODIFIED: Cast to DisplayQuestion[]
        this.totalQuestions = res.totalCount;
        this.totalPages = res.totalPages;
        this.currentPage = res.currentPage;
      },
      error: (err: any) => {
        console.error('Failed to fetch filtered questions:', err);
      }
    });
  }

  resetFilters(): void {
    this.filters = {
      branch: '',
      subject: '',
      topic: '',
      subtopic: '',
      difficulty: '',
      type: '',
      status: '',
      searchTerm: '' // ADDED: Reset search term
    };
    this.subjects = [];
    this.topics = [];
    this.subtopics = [];
    this.currentPage = 1; // Reset to first page
    this.loadQuestions(); // reload unfiltered questions
  }

  loadQuestions(): void {
    const effectiveFilters = {
      ...this.filters, // Include current filters if any (e.g. searchTerm)
      page: this.currentPage,
      limit: this.itemsPerPage
    };
    this.questionService.filterQuestions(effectiveFilters).subscribe({
      next: (res: PaginatedQuestionsResponse) => {
        this.questions = res.questions.map(q => ({
          ...q,
          displayQuestionText: this.getPrimaryTranslation(q)?.questionText || 'N/A'
        })) as DisplayQuestion[]; // MODIFIED: Cast to DisplayQuestion[]
        this.totalQuestions = res.totalCount;
        this.totalPages = res.totalPages;
        this.currentPage = res.currentPage; // Ensure currentPage is updated from response
      },
      error: (err) => console.error('Error loading questions:', err)
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

  // Renamed from onEdit to editQuestion to match HTML template call
  editQuestion(id: string | { $oid: string }): void {
    this.router.navigate(['/questions', this.getIdString(id), 'edit']);
  }

  // Renamed from onDelete to deleteQuestion to match HTML template call
  deleteQuestion(id: string | { $oid: string }): void {
    if (confirm('Are you sure you want to delete this question?')) {
      this.questionService.deleteQuestion(this.getIdString(id)).subscribe(() => {
        this.loadQuestions(); // refresh list after deletion
      });
    }
  }

  // ADDED: Method for "Full View" button
  viewQuestionDetails(id: string | { $oid: string }): void {
    this.router.navigate(['/questions', this.getIdString(id), 'view']); // Assuming a 'view' route
  }

  // ADDED: Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadQuestions();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadQuestions();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadQuestions();
    }
  }

  // Helper to generate page numbers for pagination controls
  getPageNumbers(): (number | string)[] { // MODIFIED: Return type to include string for '...'
    const pageNumbers: (number | string)[] = [];
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    const maxPagesToShow = 5; // Max number of page links to show (excluding prev/next)
    const halfMaxPages = Math.floor(maxPagesToShow / 2);

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is less than or equal to maxPagesToShow
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Complex case: totalPages > maxPagesToShow
      let startPage: number;
      let endPage: number;

      if (currentPage <= halfMaxPages) {
        // Near the beginning
        startPage = 1;
        endPage = maxPagesToShow -1; // -1 because we will add '...' and last page
        for (let i = startPage; i <= endPage; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage + halfMaxPages >= totalPages) {
        // Near the end
        startPage = totalPages - (maxPagesToShow - 2); // -2 because we add first page and '...'
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = startPage; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        // In the middle
        startPage = currentPage - (halfMaxPages -1) ; // -1 for '...'
        endPage = currentPage + (halfMaxPages-1) ; // -1 for '...'
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = startPage; i <= endPage; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    return pageNumbers;
  }

  getIdValue(id: any): string {
    if (typeof id === 'string') {
      return id;
    }
    if (id && typeof id === 'object' && '$oid' in id) {
      return id.$oid;
    }
    return ''; 
  }

  getDisplayVersion(question: Question): string {
    if (question.version === undefined || question.version === null) {
      return 'N/A';
    }
    if (typeof question.version === 'number') {
      return question.version.toString();
    }
    // Check if version is an object and has $numberInt property
    if (typeof question.version === 'object' && question.version.hasOwnProperty('$numberInt')) {
      return (question.version as { $numberInt: string }).$numberInt;
    }
    return String(question.version); // Fallback for other cases, though ideally it matches the model
  }

  // ADDED: Helper to get the primary translation
  private getPrimaryTranslation(question: Question): Translation | undefined {
    if (!question.translations || question.translations.length === 0) {
      return undefined;
    }
    // Prioritize English, then Hindi, then the first available
    const preferredLangs = ['en', 'hi'];
    for (const lang of preferredLangs) {
      const translation = question.translations.find(t => t.lang === lang);
      if (translation) return translation;
    }
    return question.translations[0]; // Fallback to the first translation
  }

  getDisplayTranslation(question: Question, field: 'questionText' | 'options' | 'explanations'): string {
    const primaryTranslation = this.getPrimaryTranslation(question);
    if (!primaryTranslation) {
      return field === 'options' || field === 'explanations' ? 'N/A (No translations)' : 'No translation available';
    }

    switch (field) {
      case 'questionText':
        return primaryTranslation.questionText || 'N/A';
      case 'options': // This case might be less used now if displayOptions is directly used
        return primaryTranslation.options && primaryTranslation.options.length > 0 
               ? primaryTranslation.options.map(o => `${o.text} (${o.isCorrect ? 'Correct' : 'Incorrect'})`).join(', ') 
               : 'No options';
      case 'explanations':
        return primaryTranslation.explanations && primaryTranslation.explanations.length > 0 
               ? primaryTranslation.explanations.map(e => e.text || 'N/A').join('; ') 
               : 'No explanations';
      default:
        return 'Invalid field';
    }
  }

  // ADDED: Helper to get language indicators
  getLanguageIndicator(question: Question): string {
    if (!question.translations || question.translations.length === 0) {
      return 'N/A';
    }
    return question.translations.map(t => t.lang.toUpperCase()).join(', ');
  }

  // MODIFIED: Helper to get options summary, now shows correct option text and index
  getOptionsSummary(question: Question): string {
    const primaryTranslation = this.getPrimaryTranslation(question);
    if (!primaryTranslation || !primaryTranslation.options || primaryTranslation.options.length === 0) {
      return 'No options available';
    }

    const correctOptions = primaryTranslation.options
      .map((option, index) => ({ text: option.text, isCorrect: option.isCorrect, originalIndex: index }))
      .filter(option => option.isCorrect);

    if (correctOptions.length === 0) {
      return 'No correct option(s) marked';
    }

    // Sort by original index to ensure consistent order if needed, though map preserves it.
    // correctOptions.sort((a, b) => a.originalIndex - b.originalIndex); 

    return 'Correct: ' + correctOptions
      .map(opt => `${opt.originalIndex + 1}. ${opt.text}`)
      .join(', ');
  }

  // ADDED: Helper to get past history summary
  getPastHistorySummary(question: Question): string {
    if (!question.questionHistory || question.questionHistory.length === 0) {
      return 'No history';
    }
    // Attempt to use the 'title' from the first history entry, otherwise a generic message
    const firstHistoryEntry = question.questionHistory[0];
    if (firstHistoryEntry && firstHistoryEntry.title) {
      return firstHistoryEntry.title;
    }
    if (firstHistoryEntry && firstHistoryEntry.examName) { // Fallback to examName
        return firstHistoryEntry.examName;
    }
    return `Used in ${question.questionHistory.length} exam(s)`;
  }
}
