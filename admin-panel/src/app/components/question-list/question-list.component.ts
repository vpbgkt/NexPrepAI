/**
 * @fileoverview Question List Component for NexPrepAI Admin Panel providing comprehensive question
 * management interface with advanced filtering, pagination, search capabilities, and bulk operations.
 * Enables administrators to efficiently browse, search, filter, and manage the entire question bank.
 * 
 * Features:
 * - Advanced multi-level filtering (branch → subject → topic → subtopic)
 * - Real-time search across question content
 * - Paginated results with customizable page sizes
 * - Question type and status filtering
 * - Difficulty level categorization
 * - Bulk operations and quick actions
 * - Question preview and full detail view
 * - Translation language indicators
 * - Question history and usage tracking
 * 
 * @version 1.0.0
 * @author NexPrepAI Development Team
 * @since 2023
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuestionService, PaginatedQuestionsResponse } from '../../services/question.service'; // MODIFIED: Import PaginatedQuestionsResponse
import { Question, PopulatedHierarchyField, Translation, Option as QuestionOption } from '../../models/question.model'; // MODIFIED: Ensure all necessary types are imported
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

/**
 * @interface DisplayQuestion
 * @description Extended Question interface with computed display properties for UI rendering
 * 
 * @extends Question
 * @property {string} displayQuestionText - Computed display text from primary translation
 */
// ADDED: Interface for questions with display properties
interface DisplayQuestion extends Question {
  displayQuestionText: string;
}

/**
 * @class QuestionListComponent
 * @description Comprehensive question management interface providing advanced filtering, search,
 * pagination, and bulk operations for administrators to efficiently manage the question bank.
 * 
 * @implements OnInit
 * 
 * Key Responsibilities:
 * - Question bank browsing and search functionality
 * - Multi-level hierarchical filtering (branch → subject → topic → subtopic)
 * - Advanced pagination with customizable page sizes
 * - Question metadata display and management
 * - Quick actions (edit, delete, view) for individual questions
 * - Translation and language support indicators
 * - Question history and usage tracking
 * 
 * @example
 * ```typescript
 * // Component provides comprehensive question management interface
 * // Features include:
 * // - Hierarchical filtering by educational taxonomy
 * // - Real-time search across question content
 * // - Paginated results with navigation controls
 * // - Question type, status, and difficulty filtering
 * // - Bulk operations and individual question actions
 * ```
 */
@Component({
  selector: 'app-question-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './question-list.component.html',
  styleUrls: ['./question-list.component.scss']
})
export class QuestionListComponent implements OnInit {
  /** @property {DisplayQuestion[]} Array of questions with computed display properties */
  questions: DisplayQuestion[] = []; // MODIFIED: Use DisplayQuestion interface
  
  /** @property {any[]} Available branches for filtering */
  branches: any[] = [];
  
  /** @property {any[]} Available subjects based on selected branch */
  subjects: any[] = [];
  
  /** @property {any[]} Available topics based on selected subject */
  topics: any[] = [];
  
  /** @property {any[]} Available subtopics based on selected topic */
  subtopics: any[] = [];

  /** @property {string[]} Available question types for filtering */
  // Reverted to string arrays as enums are not in the model file as expected
  questionTypes: string[] = ['MCQ', 'SA', 'LA', 'FITB', 'Matrix']; 
  
  /** @property {string[]} Available question statuses for filtering */
  questionStatuses: string[] = ['Draft', 'Published', 'Archived', 'Pending Review']; 
  
  /** @property {string[]} Available difficulty levels for filtering */
  difficultyLevels: string[] = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'];

  /** @property {Object} Current filter criteria for questions */
  filters = {
    branch: '',
    subject: '',
    topic: '',
    subtopic: '',
    difficulty: '',
    type: '',
    status: '',
    searchTerm: '', // ADDED: For text search
    sortBy: 'createdAt', // ADDED: Default sort by creation date
    sortOrder: 'desc' // ADDED: Default to newest first
  };

  /** @property {Object[]} Available sorting options */
  sortOptions = [
    { value: 'createdAt', label: 'Date Created', order: 'desc' },
    { value: 'createdAt', label: 'Date Created (Oldest)', order: 'asc' },
    { value: 'updatedAt', label: 'Last Modified', order: 'desc' },
    { value: 'difficulty', label: 'Difficulty Level', order: 'asc' },
    { value: 'type', label: 'Question Type', order: 'asc' },
    { value: 'status', label: 'Status', order: 'asc' }
  ];

  /** @property {number[]} Available page size options */
  pageSizeOptions = [10, 15, 25, 50, 100];

  /** @property {number} Current page number for pagination */
  // ADDED: Pagination properties
  currentPage: number = 1;
  
  /** @property {number} Number of items to display per page */
  itemsPerPage: number = 15;
  
  /** @property {number} Total number of questions matching current filters */
  totalQuestions: number = 0;
  
  /** @property {number} Total number of pages available */
  totalPages: number = 0;

  /**
   * @constructor
   * @description Initializes QuestionListComponent with required services for question management
   * and navigation functionality.
   * 
   * @param {QuestionService} questionService - Service for question data operations
   * @param {Router} router - Angular router for navigation between components
   */
  constructor(private questionService: QuestionService, private router: Router) {}
  /**
   * @method ngOnInit
   * @description Angular lifecycle hook that initializes the component by loading branches
   * and initial set of questions. Sets up the foundation for the question management interface.
   * 
   * @example
   * ```typescript
   * // Automatically called by Angular framework
   * // Loads: branch hierarchy, initial question set with pagination
   * ```
   */
  ngOnInit(): void {
    this.loadBranches();
    this.loadQuestions(); // Load initial set of questions
  }

  /**
   * @method loadBranches
   * @description Loads available educational branches for the filtering hierarchy.
   * Branches form the top level of the educational taxonomy.
   * 
   * @example
   * ```typescript
   * this.loadBranches();
   * // Populates branches array for filter dropdown
   * // Examples: Engineering, Medical, Commerce, etc.
   * ```
   */
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

  /**
   * @method onBranchChange
   * @description Handles branch selection change, loads corresponding subjects,
   * and resets dependent filter levels (subject, topic, subtopic).
   * 
   * @example
   * ```typescript
   * // Called when user selects a branch from dropdown
   * // Triggers: subject loading, filter reset, question refresh
   * ```
   */
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

  /**
   * @method onSubjectChange
   * @description Handles subject selection change, loads corresponding topics,
   * and resets dependent filter levels (topic, subtopic).
   * 
   * @example
   * ```typescript
   * // Called when user selects a subject from dropdown
   * // Triggers: topic loading, filter reset, question refresh
   * ```
   */
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

  /**
   * @method onTopicChange
   * @description Handles topic selection change, loads corresponding subtopics,
   * and resets dependent filter level (subtopic).
   * 
   * @example
   * ```typescript
   * // Called when user selects a topic from dropdown
   * // Triggers: subtopic loading, filter reset, question refresh
   * ```
   */
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

  /**
   * @method onFilterChange
   * @description Handles changes in secondary filters (subtopic, difficulty, type, status).
   * Resets pagination to first page and applies current filter criteria.
   * 
   * @example
   * ```typescript
   * // Called when user changes any secondary filter
   * // Triggers: pagination reset, filter application, question refresh
   * ```
   */
  // ADDED: Method to handle changes in subtopic, difficulty, type, or status filters
  onFilterChange(): void {
    this.currentPage = 1; // Reset to first page when filters change
    this.applyFilters();
  }
  /**
   * @method applyFilters
   * @description Applies current filter criteria to question search with pagination support.
   * Sends comprehensive filter object to backend and updates question list with results.
   * 
   * @example
   * ```typescript
   * this.applyFilters();
   * // Applies: all current filters, pagination parameters
   * // Updates: question list, pagination metadata, display properties
   * ```
   */
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

  /**
   * @method resetFilters
   * @description Resets all filter criteria to default values and reloads unfiltered questions.
   * Clears hierarchical selections and search terms, returns to first page.
   * 
   * @example
   * ```typescript
   * this.resetFilters();
   * // Clears: all filters, hierarchical selections, search terms
   * // Resets: pagination to page 1, loads all questions
   * ```
   */
  resetFilters(): void {
    this.filters = {
      branch: '',
      subject: '',
      topic: '',
      subtopic: '',
      difficulty: '',
      type: '',
      status: '',
      searchTerm: '', // ADDED: Reset search term
      sortBy: 'createdAt', // ADDED: Reset to default sort
      sortOrder: 'desc' // ADDED: Reset to newest first
    };
    this.subjects = [];
    this.topics = [];
    this.subtopics = [];
    this.currentPage = 1; // Reset to first page
    this.loadQuestions(); // reload unfiltered questions
  }

  /**
   * @method loadQuestions
   * @description Loads questions with current filter criteria and pagination settings.
   * Main method for refreshing question list with or without filters applied.
   * 
   * @example
   * ```typescript
   * this.loadQuestions();
   * // Loads: questions with current filters, pagination metadata
   * // Updates: question list, display properties, page information
   * ```
   */
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
  /**
   * @method getIdString
   * @description Safely extracts string ID from various ID formats (string, ObjectId, PopulatedField).
   * Handles complex nested ID structures and provides consistent string output.
   * 
   * @param {string | { $oid: string } | PopulatedHierarchyField | undefined} idValue - ID value in various formats
   * @returns {string} Normalized string ID or empty string if extraction fails
   * 
   * @example
   * ```typescript
   * const stringId = this.getIdString(question._id);
   * // Handles: "abc123", { $oid: "abc123" }, { _id: "abc123", name: "Question" }
   * // Returns: "abc123" in all cases
   * ```
   */
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

  /**
   * @method getPopulatedFieldName
   * @description Extracts display name from populated hierarchy fields for UI display.
   * 
   * @param {string | { $oid: string } | PopulatedHierarchyField | undefined} field - Populated field to extract name from
   * @returns {string | null} Display name or null if not a populated field
   * 
   * @example
   * ```typescript
   * const branchName = this.getPopulatedFieldName(question.branch);
   * // Returns: "Engineering" for populated field, null for string ID
   * ```
   */
  // ADDED: Helper to get name from populated field
  getPopulatedFieldName(field: string | { $oid: string } | PopulatedHierarchyField | undefined): string | null {
    // Check if it's a PopulatedHierarchyField and has a name
    if (field && typeof field === 'object' && '_id' in field && 'name' in field && typeof (field as PopulatedHierarchyField).name === 'string') {
      return (field as PopulatedHierarchyField).name;
    }
    return null;
  }

  /**
   * @method editQuestion
   * @description Navigates to question edit page for the specified question ID.
   * 
   * @param {string | { $oid: string }} id - Question ID to edit
   * 
   * @example
   * ```typescript
   * this.editQuestion(question._id);
   * // Navigates to: /questions/edit/[questionId]
   * ```
   */
  // Renamed from onEdit to editQuestion to match HTML template call
  editQuestion(id: string | { $oid: string }): void {
    this.router.navigate(['/questions', 'edit', this.getIdString(id)]);
  }

  /**
   * @method deleteQuestion
   * @description Deletes a question after user confirmation and refreshes the question list.
   * 
   * @param {string | { $oid: string }} id - Question ID to delete
   * 
   * @example
   * ```typescript
   * this.deleteQuestion(question._id);
   * // Shows: confirmation dialog, performs deletion, refreshes list
   * ```
   */
  // Renamed from onDelete to deleteQuestion to match HTML template call
  deleteQuestion(id: string | { $oid: string }): void {
    if (confirm('Are you sure you want to delete this question?')) {
      this.questionService.deleteQuestion(this.getIdString(id)).subscribe(() => {
        this.loadQuestions(); // refresh list after deletion
      });
    }
  }

  /**
   * @method viewQuestionDetails
   * @description Navigates to detailed view page for the specified question.
   * 
   * @param {string | { $oid: string }} id - Question ID to view
   * 
   * @example
   * ```typescript
   * this.viewQuestionDetails(question._id);
   * // Navigates to: /questions/[questionId]/view
   * ```
   */
  // ADDED: Method for "Full View" button
  viewQuestionDetails(id: string | { $oid: string }): void {
    this.router.navigate(['/questions', this.getIdString(id), 'view']); // Assuming a 'view' route
  }
  /**
   * @method goToPage
   * @description Navigates to a specific page number with bounds validation.
   * 
   * @param {number} page - Target page number to navigate to
   * 
   * @example
   * ```typescript
   * this.goToPage(5);
   * // Navigates to page 5 if within valid range (1 to totalPages)
   * ```
   */
  // ADDED: Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadQuestions();
    }
  }

  /**
   * @method handlePageClick
   * @description Handles page number clicks from pagination controls with type safety.
   * 
   * @param {string | number} pageNum - Page number or ellipsis string from pagination
   * 
   * @example
   * ```typescript
   * this.handlePageClick(3);     // Navigates to page 3
   * this.handlePageClick('...'); // Ignored (ellipsis)
   * ```
   */
  // ADDED: Method to handle page click from template, ensuring type safety
  handlePageClick(pageNum: string | number): void {
    if (typeof pageNum === 'number') {
      this.goToPage(pageNum);
    }
    // If it's '...', do nothing, as the button should be disabled anyway.
  }

  /**
   * @method nextPage
   * @description Navigates to the next page if available.
   * 
   * @example
   * ```typescript
   * this.nextPage();
   * // Moves to next page if not at the last page
   * ```
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadQuestions();
    }
  }

  /**
   * @method previousPage
   * @description Navigates to the previous page if available.
   * 
   * @example
   * ```typescript
   * this.previousPage();
   * // Moves to previous page if not at the first page
   * ```
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadQuestions();
    }
  }
  /**
   * @method getPageNumbers
   * @description Generates smart pagination control array with ellipsis for large page counts.
   * Implements intelligent pagination display logic for optimal user experience.
   * 
   * @returns {(number | string)[]} Array of page numbers and ellipsis strings for pagination controls
   * 
   * @example
   * ```typescript
   * const pageNumbers = this.getPageNumbers();
   * // Returns: [1, 2, 3, 4, 5] for small total
   * // Returns: [1, '...', 8, 9, 10, '...', 20] for large total with current page 9
   * ```
   */
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

  /**
   * @method getIdValue
   * @description Extracts ID value from MongoDB ObjectId format for display purposes.
   * 
   * @param {any} id - ID in various MongoDB formats
   * @returns {string} String representation of the ID
   * 
   * @example
   * ```typescript
   * const displayId = this.getIdValue(question._id);
   * // Handles: string IDs, { $oid: "..." } objects
   * ```
   */
  getIdValue(id: any): string {
    if (typeof id === 'string') {
      return id;
    }
    if (id && typeof id === 'object' && '$oid' in id) {
      return id.$oid;
    }
    return ''; 
  }

  /**
   * @method getDisplayVersion
   * @description Converts question version from various formats to display string.
   * 
   * @param {Question} question - Question object containing version information
   * @returns {string} Human-readable version string
   * 
   * @example
   * ```typescript
   * const version = this.getDisplayVersion(question);
   * // Returns: "1", "2", "N/A" based on version format
   * ```
   */
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
  /**
   * @method getPrimaryTranslation
   * @description Retrieves the primary translation for display purposes, prioritizing English then Hindi.
   * 
   * @param {Question} question - Question object containing translations
   * @returns {Translation | undefined} Primary translation or undefined if none available
   * 
   * @example
   * ```typescript
   * const primaryTranslation = this.getPrimaryTranslation(question);
   * const questionText = primaryTranslation?.questionText || 'No text available';
   * ```
   */
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

  /**
   * @method getDisplayTranslation
   * @description Retrieves formatted display text for specific question fields from primary translation.
   * 
   * @param {Question} question - Question object to extract translation from
   * @param {'questionText' | 'options' | 'explanations'} field - Field to extract
   * @returns {string} Formatted display text for the specified field
   * 
   * @example
   * ```typescript
   * const questionText = this.getDisplayTranslation(question, 'questionText');
   * const optionsSummary = this.getDisplayTranslation(question, 'options');
   * const explanations = this.getDisplayTranslation(question, 'explanations');
   * ```
   */
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
               ? primaryTranslation.explanations.map(e => (e.label ? `${e.label}: ` : '') + (e.content || 'N/A')).join('; ') 
               : 'No explanations';
      default:
        return 'Invalid field';
    }
  }

  /**
   * @method getLanguageIndicator
   * @description Generates language indicator string showing available translations.
   * 
   * @param {Question} question - Question object to check for translations
   * @returns {string} Comma-separated list of language codes (e.g., "EN, HI")
   * 
   * @example
   * ```typescript
   * const languages = this.getLanguageIndicator(question);
   * // Returns: "EN, HI" or "EN" or "N/A" based on available translations
   * ```
   */
  // ADDED: Helper to get language indicators
  getLanguageIndicator(question: Question): string {
    if (!question.translations || question.translations.length === 0) {
      return 'N/A';
    }
    return question.translations.map(t => t.lang.toUpperCase()).join(', ');
  }

  /**
   * @method getOptionsSummary
   * @description Generates summary of correct options with their indices and text.
   * 
   * @param {Question} question - Question object to analyze options
   * @returns {string} Formatted summary of correct options
   * 
   * @example
   * ```typescript
   * const summary = this.getOptionsSummary(question);
   * // Returns: "Correct: 1. Option A, 3. Option C" for multiple correct
   * // Returns: "Correct: 2. Option B" for single correct
   * ```
   */
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

  /**
   * @method getPastHistorySummary
   * @description Generates summary of question's usage history in past examinations.
   * 
   * @param {Question} question - Question object to check history
   * @returns {string} Summary of past usage or "No history" if unused
   * 
   * @example
   * ```typescript
   * const history = this.getPastHistorySummary(question);
   * // Returns: "JEE Main 2023" (specific exam) or "Used in 3 exam(s)" (generic)
   * ```
   */
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

  /**
   * @method onSortChange
   * @description Handles sort option change and reloads questions with new sorting
   * 
   * @param {string} sortBy - The field to sort by
   * @param {string} sortOrder - The sort order (asc/desc)
   */
  onSortChange(sortBy: string, sortOrder: string): void {
    this.filters.sortBy = sortBy;
    this.filters.sortOrder = sortOrder;
    this.currentPage = 1; // Reset to first page when sorting changes
    this.loadQuestions();
  }

  /**
   * @method handleSortChange
   * @description Handles sort dropdown change event with proper type casting
   * 
   * @param {Event} event - The change event from the select element
   */
  handleSortChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    const [sortBy, sortOrder] = value.split('|');
    this.onSortChange(sortBy, sortOrder);
  }

  /**
   * @method onPageSizeChange
   * @description Handles page size change and reloads questions with new page size
   * 
   * @param {number} newSize - The new page size
   */
  onPageSizeChange(newSize: number): void {
    this.itemsPerPage = newSize;
    this.currentPage = 1; // Reset to first page when page size changes
    this.loadQuestions();
  }

  /**
   * @method getDisplayRange
   * @description Calculates the range of items being displayed for pagination info
   * 
   * @returns {Object} Object containing start and end indices
   */
  getDisplayRange(): { start: number; end: number } {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.totalQuestions);
    return { start, end };
  }
}
