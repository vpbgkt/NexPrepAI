/**
 * @fileoverview Question Service for NexPrepAI Admin Panel
 * @description Provides comprehensive question management functionality including CRUD operations,
 * filtering, hierarchy management, and import capabilities for the admin panel.
 * @module QuestionService
 * @requires @angular/core
 * @requires @angular/common/http
 * @requires Question
 * @requires rxjs
 * @requires environment
 * @author NexPrepAI Development Team
 * @since 1.0.0
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Question } from '../models/question.model';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * @interface PaginatedQuestionsResponse
 * @description Interface for paginated questions response from the API
 */
export interface PaginatedQuestionsResponse {
  /** Array of questions for the current page */
  questions: Question[];
  /** Total number of questions matching the filter criteria */
  totalCount: number;
  /** Current page number (1-based) */
  currentPage: number;
  /** Total number of pages available */
  totalPages: number;
}

/**
 * @class QuestionService
 * @description Angular service for managing questions in the NexPrepAI admin panel.
 * Handles all question-related operations including CRUD operations, filtering,
 * hierarchy management, and bulk operations.
 * 
 * @example
 * ```typescript
 * constructor(private questionService: QuestionService) {}
 * 
 * // Add a new question
 * this.questionService.addQuestion(questionData).subscribe(
 *   response => console.log('Question added:', response),
 *   error => console.error('Error adding question:', error)
 * );
 * 
 * // Filter questions with pagination
 * this.questionService.filterQuestions({
 *   branch: 'engineering',
 *   difficulty: 'medium',
 *   page: 1,
 *   limit: 20
 * }).subscribe(response => {
 *   this.questions = response.questions;
 *   this.totalPages = response.totalPages;
 * });
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class QuestionService {

  /** @private Base API URL from environment configuration */
  private apiUrl = environment.apiUrl; // ✅ Correct key used

  /**
   * @constructor
   * @description Initializes the QuestionService with HTTP client dependency
   * @param {HttpClient} http - Angular HTTP client for API communication
   */
  constructor(private http: HttpClient) {}
  /**
   * @method addQuestion
   * @description Creates a new question in the system
   * @param {any} questionData - Question data object containing all question details
   * @param {string} questionData.questionText - The question text
   * @param {string} questionData.difficulty - Question difficulty level (easy/medium/hard)
   * @param {string} questionData.type - Question type (MCQ/MSQ/Integer/True-False)
   * @param {string} questionData.branch - Branch ID
   * @param {string} questionData.subject - Subject ID
   * @param {string} questionData.topic - Topic ID
   * @param {string} questionData.subtopic - Subtopic ID
   * @param {Array} questionData.options - Array of answer options
   * @param {Array} questionData.correctOptions - Array of correct option indices
   * @param {string} [questionData.explanation] - Optional explanation for the answer
   * @returns {Observable<any>} Observable containing the created question response
   * @throws {HttpErrorResponse} When authentication fails or validation errors occur
   * 
   * @example
   * ```typescript
   * const questionData = {
   *   questionText: "What is the capital of France?",
   *   difficulty: "easy",
   *   type: "MCQ",
   *   branch: "605c7b9f1a2b3c4d5e6f7890",
   *   subject: "605c7b9f1a2b3c4d5e6f7891",
   *   topic: "605c7b9f1a2b3c4d5e6f7892",
   *   subtopic: "605c7b9f1a2b3c4d5e6f7893",
   *   options: ["London", "Berlin", "Paris", "Madrid"],
   *   correctOptions: [2],
   *   explanation: "Paris is the capital and largest city of France."
   * };
   * 
   * this.questionService.addQuestion(questionData).subscribe({
   *   next: (response) => console.log('Question created:', response),
   *   error: (error) => console.error('Creation failed:', error)
   * });
   * ```
   */
  addQuestion(questionData: any): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post(`${this.apiUrl}/questions/add`, questionData, { headers });
  }
  /**
   * @method getBranches
   * @description Retrieves all available branches from the hierarchy
   * @returns {Observable<any>} Observable containing array of branch objects
   * @throws {HttpErrorResponse} When authentication fails or server error occurs
   * 
   * @example
   * ```typescript
   * this.questionService.getBranches().subscribe({
   *   next: (branches) => {
   *     this.branches = branches;
   *     console.log('Available branches:', branches);
   *   },
   *   error: (error) => console.error('Failed to load branches:', error)
   * });
   * ```
   */
  getBranches(): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get(`${this.apiUrl}/hierarchy/branch`, { headers });
  }

  /**
   * @method getSubjects
   * @description Retrieves subjects for a specific branch
   * @param {string} branchId - The ID of the branch to get subjects for
   * @returns {Observable<any>} Observable containing array of subject objects
   * @throws {HttpErrorResponse} When authentication fails or branch not found
   * 
   * @example
   * ```typescript
   * this.questionService.getSubjects('605c7b9f1a2b3c4d5e6f7890').subscribe({
   *   next: (subjects) => {
   *     this.subjects = subjects;
   *     console.log('Available subjects:', subjects);
   *   },
   *   error: (error) => console.error('Failed to load subjects:', error)
   * });
   * ```
   */
  getSubjects(branchId: string): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get(`${this.apiUrl}/hierarchy/subject?branchId=${branchId}`, { headers });
  }

  /**
   * @method getTopics
   * @description Retrieves topics for a specific subject
   * @param {string} subjectId - The ID of the subject to get topics for
   * @returns {Observable<any>} Observable containing array of topic objects
   * @throws {HttpErrorResponse} When authentication fails or subject not found
   * 
   * @example
   * ```typescript
   * this.questionService.getTopics('605c7b9f1a2b3c4d5e6f7891').subscribe({
   *   next: (topics) => {
   *     this.topics = topics;
   *     console.log('Available topics:', topics);
   *   },
   *   error: (error) => console.error('Failed to load topics:', error)
   * });
   * ```
   */
  getTopics(subjectId: string): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get(`${this.apiUrl}/hierarchy/topic?subjectId=${subjectId}`, { headers });
  }

  /**
   * @method getSubtopics
   * @description Retrieves subtopics for a specific topic
   * @param {string} topicId - The ID of the topic to get subtopics for
   * @returns {Observable<any>} Observable containing array of subtopic objects
   * @throws {HttpErrorResponse} When authentication fails or topic not found
   * 
   * @example
   * ```typescript
   * this.questionService.getSubtopics('605c7b9f1a2b3c4d5e6f7892').subscribe({
   *   next: (subtopics) => {
   *     this.subtopics = subtopics;
   *     console.log('Available subtopics:', subtopics);
   *   },
   *   error: (error) => console.error('Failed to load subtopics:', error)
   * });
   * ```
   */
  getSubtopics(topicId: string): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get(`${this.apiUrl}/hierarchy/subtopic?topicId=${topicId}`, { headers });
  }
  /**
   * @method getQuestions
   * @description Retrieves questions with pagination support
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 50)
   * @param {string} search - Optional search term
   * @returns {Observable<{questions: Question[], pagination: any}>} Observable containing paginated questions and metadata
   * @throws {HttpErrorResponse} When authentication fails or server error occurs
   * 
   * @example
   * ```typescript
   * this.questionService.getQuestions(1, 20, 'mathematics').subscribe({
   *   next: (response) => {
   *     this.questions = response.questions;
   *     this.totalPages = response.pagination.totalPages;
   *   }
   * });
   * ```
   */
  getQuestions(page: number = 1, limit: number = 50, search?: string): Observable<{questions: Question[], pagination: any}> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (search) {
      params = params.set('search', search);
    }
    
    return this.http.get<{questions: Question[], pagination: any}>(`${this.apiUrl}/questions/all`, { headers, params });
  }
  
  /**
   * @method deleteQuestion
   * @description Deletes a question by its unique identifier
   * @param {string} id - The unique identifier of the question to delete
   * @returns {Observable<any>} Observable containing deletion confirmation response
   * @throws {HttpErrorResponse} When authentication fails, question not found, or deletion restricted
   * 
   * @example
   * ```typescript
   * this.questionService.deleteQuestion('605c7b9f1a2b3c4d5e6f7890').subscribe({
   *   next: (response) => {
   *     console.log('Question deleted successfully:', response);
   *     this.refreshQuestionList();
   *   },
   *   error: (error) => console.error('Failed to delete question:', error)
   * });
   * ```
   */
  /** Delete a question by its ID */
  deleteQuestion(id: string): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.delete(`${this.apiUrl}/questions/${id}`, { headers });
  }
  
  /**
   * @method updateQuestion
   * @description Updates an existing question with new data
   * @param {string} id - The unique identifier of the question to update
   * @param {any} questionData - Updated question data object
   * @param {string} [questionData.questionText] - Updated question text
   * @param {string} [questionData.difficulty] - Updated difficulty level
   * @param {string} [questionData.type] - Updated question type
   * @param {Array} [questionData.options] - Updated answer options
   * @param {Array} [questionData.correctOptions] - Updated correct option indices
   * @param {string} [questionData.explanation] - Updated explanation
   * @returns {Observable<any>} Observable containing updated question response
   * @throws {HttpErrorResponse} When authentication fails, question not found, or validation errors
   * 
   * @example
   * ```typescript
   * const updatedData = {
   *   questionText: "What is the updated capital of France?",
   *   difficulty: "medium",
   *   explanation: "Updated explanation for the answer."
   * };
   * 
   * this.questionService.updateQuestion('605c7b9f1a2b3c4d5e6f7890', updatedData).subscribe({
   *   next: (response) => console.log('Question updated:', response),
   *   error: (error) => console.error('Update failed:', error)
   * });
   * ```
   */
  /** Update a question */
  updateQuestion(id: string, questionData: any): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.put(`${this.apiUrl}/questions/${id}`, questionData, { headers });
  }

  /**
   * @method getQuestionById
   * @description Retrieves a single question by its unique identifier
   * @param {string} id - The unique identifier of the question to retrieve
   * @returns {Observable<Question>} Observable containing the question object
   * @throws {HttpErrorResponse} When authentication fails or question not found
   * 
   * @example
   * ```typescript
   * this.questionService.getQuestionById('605c7b9f1a2b3c4d5e6f7890').subscribe({
   *   next: (question) => {
   *     this.currentQuestion = question;
   *     console.log('Question loaded:', question.questionText);
   *   },
   *   error: (error) => console.error('Question not found:', error)
   * });
   * ```
   */
  /** Fetch one question by ID */
  getQuestionById(id: string): Observable<Question> { // MODIFIED: Return type to Observable<Question>
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<Question>(`${this.apiUrl}/questions/${id}`, { headers }); // MODIFIED: Specify type for http.get
  }
  /**
   * @method createSubject
   * @description Creates a new subject under a specific branch
   * @param {Object} data - Subject creation data
   * @param {string} data.name - Name of the new subject
   * @param {string|null} data.branchId - ID of the parent branch
   * @returns {Observable<any>} Observable containing created subject response
   * @throws {HttpErrorResponse} When authentication fails or validation errors occur
   * 
   * @example
   * ```typescript
   * const subjectData = {
   *   name: "Mathematics",
   *   branchId: "605c7b9f1a2b3c4d5e6f7890"
   * };
   * 
   * this.questionService.createSubject(subjectData).subscribe({
   *   next: (response) => console.log('Subject created:', response),
   *   error: (error) => console.error('Subject creation failed:', error)
   * });
   * ```
   */
  createSubject(data: { name: string; branchId: string | null }) {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.post(`${this.apiUrl}/hierarchy/subject`, data, { headers });
  }

  /**
   * @method createTopic
   * @description Creates a new topic under a specific subject
   * @param {Object} data - Topic creation data
   * @param {string} data.name - Name of the new topic
   * @param {string|null} data.subjectId - ID of the parent subject
   * @returns {Observable<any>} Observable containing created topic response
   * @throws {HttpErrorResponse} When authentication fails or validation errors occur
   * 
   * @example
   * ```typescript
   * const topicData = {
   *   name: "Algebra",
   *   subjectId: "605c7b9f1a2b3c4d5e6f7891"
   * };
   * 
   * this.questionService.createTopic(topicData).subscribe({
   *   next: (response) => console.log('Topic created:', response),
   *   error: (error) => console.error('Topic creation failed:', error)
   * });
   * ```
   */
  createTopic(data: { name: string; subjectId: string | null }) {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.post(`${this.apiUrl}/hierarchy/topic`, data, { headers });
  }

  /**
   * @method createSubtopic
   * @description Creates a new subtopic under a specific topic
   * @param {Object} data - Subtopic creation data
   * @param {string} data.name - Name of the new subtopic
   * @param {string|null} data.topicId - ID of the parent topic
   * @returns {Observable<any>} Observable containing created subtopic response
   * @throws {HttpErrorResponse} When authentication fails or validation errors occur
   * 
   * @example
   * ```typescript
   * const subtopicData = {
   *   name: "Linear Equations",
   *   topicId: "605c7b9f1a2b3c4d5e6f7892"
   * };
   * 
   * this.questionService.createSubtopic(subtopicData).subscribe({
   *   next: (response) => console.log('Subtopic created:', response),
   *   error: (error) => console.error('Subtopic creation failed:', error)
   * });
   * ```
   */
  createSubtopic(data: { name: string; topicId: string | null }) {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.post(`${this.apiUrl}/hierarchy/subtopic`, data, { headers });
  }
  /**
   * @method filterQuestions
   * @description Filters questions based on multiple criteria with pagination support
   * @param {Object} filters - Filter criteria object
   * @param {string} [filters.branch] - Branch filter (optional)
   * @param {string} [filters.subject] - Subject filter
   * @param {string} [filters.topic] - Topic filter
   * @param {string} [filters.subtopic] - Subtopic filter
   * @param {string} [filters.difficulty] - Difficulty level filter (easy/medium/hard)
   * @param {string} [filters.type] - Question type filter (MCQ/MSQ/Integer/True-False)
   * @param {string} [filters.status] - Question status filter (active/inactive)
   * @param {string} [filters.searchTerm] - Text search term for question content
   * @param {number} [filters.page] - Page number for pagination (1-based)
   * @param {number} [filters.limit] - Number of questions per page
   * @returns {Observable<PaginatedQuestionsResponse>} Observable containing paginated questions response
   * @throws {HttpErrorResponse} When authentication fails or invalid filter parameters
   * 
   * @example
   * ```typescript
   * // Basic filtering with pagination
   * const filters = {
   *   branch: 'engineering',
   *   difficulty: 'medium',
   *   type: 'MCQ',
   *   page: 1,
   *   limit: 20
   * };
   * 
   * this.questionService.filterQuestions(filters).subscribe({
   *   next: (response) => {
   *     this.questions = response.questions;
   *     this.totalPages = response.totalPages;
   *     this.currentPage = response.currentPage;
   *     console.log(`Loaded ${response.questions.length} of ${response.totalCount} questions`);
   *   },
   *   error: (error) => console.error('Filter failed:', error)
   * });
   * 
   * // Search with text term
   * const searchFilters = {
   *   searchTerm: 'integration',
   *   subject: 'mathematics',
   *   page: 1,
   *   limit: 10
   * };
   * 
   * this.questionService.filterQuestions(searchFilters).subscribe({
   *   next: (response) => {
   *     this.searchResults = response.questions;
   *   }
   * });
   * ```
   */
  // MODIFIED: Updated to handle pagination parameters and new response structure
  filterQuestions(filters: {
    branch?: string; // Made branch optional as it might not always be selected initially
    subject?: string;
    topic?: string;
    subtopic?: string;
    difficulty?: string;
    type?: string;
    status?: string;
    searchTerm?: string;
    page?: number; // ADDED page
    limit?: number; // ADDED limit
  }): Observable<PaginatedQuestionsResponse> { // MODIFIED return type
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    let params = new HttpParams();

    if (filters.branch) params = params.append('branch', filters.branch);
    if (filters.subject) params = params.append('subject', filters.subject);
    if (filters.topic) params = params.append('topic', filters.topic);
    if (filters.subtopic) params = params.append('subtopic', filters.subtopic);
    if (filters.difficulty) params = params.append('difficulty', filters.difficulty);
    if (filters.type) params = params.append('type', filters.type);
    if (filters.status) params = params.append('status', filters.status);
    if (filters.searchTerm) params = params.append('searchTerm', filters.searchTerm);
    if (filters.page) params = params.append('page', filters.page.toString());
    if (filters.limit) params = params.append('limit', filters.limit.toString());

    return this.http.get<PaginatedQuestionsResponse>(`${this.apiUrl}/questions/filter`, { headers, params });
  }
  /**
   * @method importQuestions
   * @description Imports multiple questions from CSV or bulk data
   * @param {any[]} qs - Array of question objects to import
   * @param {string} qs[].questionText - Question text
   * @param {string} qs[].difficulty - Difficulty level
   * @param {string} qs[].type - Question type
   * @param {string} qs[].branch - Branch identifier
   * @param {string} qs[].subject - Subject identifier
   * @param {string} qs[].topic - Topic identifier
   * @param {string} qs[].subtopic - Subtopic identifier
   * @param {Array} qs[].options - Answer options array
   * @param {Array} qs[].correctOptions - Correct option indices
   * @returns {Observable<any>} Observable containing import results and statistics
   * @throws {HttpErrorResponse} When authentication fails or import validation errors occur
   * 
   * @example
   * ```typescript
   * const questionsToImport = [
   *   {
   *     questionText: "What is 2+2?",
   *     difficulty: "easy",
   *     type: "MCQ",
   *     branch: "mathematics",
   *     subject: "arithmetic",
   *     topic: "addition",
   *     subtopic: "basic_addition",
   *     options: ["3", "4", "5", "6"],
   *     correctOptions: [1]
   *   },
   *   // ... more questions
   * ];
   * 
   * this.questionService.importQuestions(questionsToImport).subscribe({
   *   next: (result) => {
   *     console.log(`Import completed: ${result.successful} successful, ${result.failed} failed`);
   *     this.refreshQuestionList();
   *   },
   *   error: (error) => console.error('Import failed:', error)
   * });
   * ```
   */
  importQuestions(qs: any[]): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post(
      `${this.apiUrl}/questions/import-csv`,
      qs,
      { headers }
    );
  }

  /**
   * @method getAll
   * @description Retrieves questions with pagination support (legacy method for compatibility)
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 100)
   * @returns {Observable<{questions: Question[], pagination: any}>} Observable containing paginated questions
   * @throws {HttpErrorResponse} When authentication fails or server error occurs
   * 
   * @example
   * ```typescript
   * this.questionService.getAll(1, 100).subscribe({
   *   next: (response) => {
   *     this.questionsList = response.questions;
   *     this.pagination = response.pagination;
   *   }
   * });
   * ```
   */
  getAll(page: number = 1, limit: number = 100): Observable<{questions: Question[], pagination: any}> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    return this.http.get<{questions: Question[], pagination: any}>(`${this.apiUrl}/questions/all`, { headers, params });
  }

  /**
   * @method getExamTypes
   * @description Retrieves available exam types for question categorization
   * @returns {Observable<{_id: string; code: string; name: string}[]>} Observable containing exam types array
   * @throws {HttpErrorResponse} When authentication fails or server error occurs
   * 
   * @example
   * ```typescript
   * this.questionService.getExamTypes().subscribe({
   *   next: (examTypes) => {
   *     this.examTypes = examTypes;
   *     console.log('Available exam types:', examTypes.map(et => et.name));
   *   },
   *   error: (error) => console.error('Failed to load exam types:', error)
   * });
   * ```
   */
  /** Fetch list of exam types for the dropdown */
  getExamTypes(): Observable<{ _id: string; code: string; name: string }[]> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<{ _id: string; code: string; name: string }[]>(`${this.apiUrl}/examTypes`, { headers });
  }

  /**
   * @method getQuestionsByStatus
   * @description Retrieves questions filtered by a specific status, with pagination.
   * @param {string} status - The status to filter questions by (e.g., 'Pending Review').
   * @param {number} [page] - Page number for pagination (1-based).
   * @param {number} [limit] - Number of questions per page.
   * @returns {Observable<PaginatedQuestionsResponse>} Observable containing paginated questions response.
   * @throws {HttpErrorResponse} When authentication fails or server error occurs.
   */
  getQuestionsByStatus(status: string, page?: number, limit?: number): Observable<PaginatedQuestionsResponse> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    let params = new HttpParams().set('status', status);
    if (page) {
      params = params.set('page', page.toString());
    }
    if (limit) {
      params = params.set('limit', limit.toString());
    }
    // Assuming the backend endpoint /questions/filter can also be used by just passing status, page, and limit
    // Or, if there's a dedicated endpoint like /questions/status/:status, adjust accordingly.
    // For now, using the existing filter endpoint seems plausible if it supports status-only filtering.
    return this.http.get<PaginatedQuestionsResponse>(`${this.apiUrl}/questions/filter`, { headers, params });
  }

  /**
   * @method updateQuestionStatus
   * @description Updates the status of a specific question.
   * @param {string} questionId - The ID of the question to update.
   * @param {string} status - The new status to set for the question.
   * @returns {Observable<any>} Observable containing the backend's response.
   * @throws {HttpErrorResponse} When authentication fails, question not found, or update is not permitted.
   */
  updateQuestionStatus(questionId: string, status: string): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.put(`${this.apiUrl}/questions/${questionId}/status`, { status }, { headers });
  }
}
