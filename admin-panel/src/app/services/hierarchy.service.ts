/**
 * @fileoverview Hierarchy Service for NexPrep Admin Panel
 * @description Provides educational hierarchy management functionality for organizing
 * academic content in a structured Branch → Subject → Topic → Subtopic hierarchy.
 * @module HierarchyService
 * @requires @angular/core
 * @requires @angular/common/http
 * @requires rxjs
 * @requires environment
 * @author NexPrep Development Team
 * @since 1.0.0
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * @interface Branch
 * @description Represents a top-level academic branch (e.g., Engineering, Medical)
 */
export interface Branch   { 
  /** Unique identifier for the branch */
  _id: string; 
  /** Display name of the branch */
  name: string; 
}

/**
 * @interface Subject
 * @description Represents a subject within a branch (e.g., Mathematics, Physics)
 */
export interface Subject  { 
  /** Unique identifier for the subject */
  _id: string; 
  /** Display name of the subject */
  name: string; 
  /** Parent branch identifier */
  branchId: string; 
}

/**
 * @interface Topic
 * @description Represents a topic within a subject (e.g., Calculus, Mechanics)
 */
export interface Topic    { 
  /** Unique identifier for the topic */
  _id: string; 
  /** Display name of the topic */
  name: string; 
  /** Parent subject identifier */
  subjectId: string; 
}

/**
 * @interface Subtopic
 * @description Represents a subtopic within a topic (e.g., Integration, Differentiation)
 */
export interface Subtopic { 
  /** Unique identifier for the subtopic */
  _id: string; 
  /** Display name of the subtopic */
  name: string; 
  /** Parent topic identifier */
  topicId: string; 
}

/**
 * @class HierarchyService
 * @description Angular service for managing educational content hierarchy in the NexPrep admin panel.
 * Provides methods to retrieve and navigate through the four-level academic structure:
 * Branch → Subject → Topic → Subtopic
 * 
 * @example
 * ```typescript
 * constructor(private hierarchyService: HierarchyService) {}
 * 
 * // Load the complete hierarchy
 * ngOnInit() {
 *   this.hierarchyService.getBranches().subscribe(branches => {
 *     this.branches = branches;
 *     if (branches.length > 0) {
 *       this.loadSubjects(branches[0]._id);
 *     }
 *   });
 * }
 * 
 * // Load subjects when branch is selected
 * onBranchSelect(branchId: string) {
 *   this.hierarchyService.getSubjects(branchId).subscribe(subjects => {
 *     this.subjects = subjects;
 *     this.topics = [];
 *     this.subtopics = [];
 *   });
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class HierarchyService {
  /** @private Base API URL for hierarchy endpoints */
  private base = `${environment.apiUrl}/hierarchy`;

  /**
   * @constructor
   * @description Initializes the HierarchyService with HTTP client dependency
   * @param {HttpClient} http - Angular HTTP client for API communication
   */
  constructor(private http: HttpClient) {}
  /**
   * @method getBranches
   * @description Retrieves all available academic branches from the system
   * @returns {Observable<Branch[]>} Observable containing array of branch objects
   * @throws {HttpErrorResponse} When server error occurs or network connectivity issues
   * 
   * @example
   * ```typescript
   * this.hierarchyService.getBranches().subscribe({
   *   next: (branches) => {
   *     this.branches = branches;
   *     console.log(`Loaded ${branches.length} branches:`, branches.map(b => b.name));
   *     
   *     // Populate branch dropdown
   *     this.branchOptions = branches.map(branch => ({
   *       value: branch._id,
   *       label: branch.name
   *     }));
   *   },
   *   error: (error) => console.error('Failed to load branches:', error)
   * });
   * ```
   */
  /** Get all branches */
  getBranches(): Observable<Branch[]> {
    return this.http.get<Branch[]>(`${this.base}/branch`);
  }

  /**
   * @method getSubjects
   * @description Retrieves all subjects for a specific branch
   * @param {string} branchId - The unique identifier of the branch
   * @returns {Observable<Subject[]>} Observable containing array of subject objects
   * @throws {HttpErrorResponse} When branch not found or server error occurs
   * 
   * @example
   * ```typescript
   * // Load subjects when branch is selected
   * onBranchChange(branchId: string) {
   *   if (branchId) {
   *     this.hierarchyService.getSubjects(branchId).subscribe({
   *       next: (subjects) => {
   *         this.subjects = subjects;
   *         this.topics = []; // Clear dependent selections
   *         this.subtopics = [];
   *         console.log(`Loaded ${subjects.length} subjects for branch:`, subjects);
   *       },
   *       error: (error) => console.error('Failed to load subjects:', error)
   *     });
   *   }
   * }
   * ```
   */
  /** Get subjects for a branch */
  getSubjects(branchId: string): Observable<Subject[]> {
    return this.http.get<Subject[]>(`${this.base}/subject`, {
      params: new HttpParams().set('branchId', branchId)
    });
  }

  /**
   * @method getTopics
   * @description Retrieves all topics for a specific subject
   * @param {string} subjectId - The unique identifier of the subject
   * @returns {Observable<Topic[]>} Observable containing array of topic objects
   * @throws {HttpErrorResponse} When subject not found or server error occurs
   * 
   * @example
   * ```typescript
   * // Load topics when subject is selected
   * onSubjectChange(subjectId: string) {
   *   if (subjectId) {
   *     this.hierarchyService.getTopics(subjectId).subscribe({
   *       next: (topics) => {
   *         this.topics = topics;
   *         this.subtopics = []; // Clear dependent selection
   *         
   *         // Update UI
   *         this.topicControl.enable();
   *         console.log(`Loaded ${topics.length} topics for subject:`, topics);
   *       },
   *       error: (error) => console.error('Failed to load topics:', error)
   *     });
   *   }
   * }
   * ```
   */
  /** Get topics for a subject */
  getTopics(subjectId: string): Observable<Topic[]> {
    return this.http.get<Topic[]>(`${this.base}/topic`, {
      params: new HttpParams().set('subjectId', subjectId)
    });
  }

  /**
   * @method getSubtopics
   * @description Retrieves all subtopics for a specific topic
   * @param {string} topicId - The unique identifier of the topic
   * @returns {Observable<Subtopic[]>} Observable containing array of subtopic objects
   * @throws {HttpErrorResponse} When topic not found or server error occurs
   * 
   * @example
   * ```typescript
   * // Load subtopics when topic is selected
   * onTopicChange(topicId: string) {
   *   if (topicId) {
   *     this.hierarchyService.getSubtopics(topicId).subscribe({
   *       next: (subtopics) => {
   *         this.subtopics = subtopics;
   *         
   *         // Enable subtopic selection
   *         this.subtopicControl.enable();
   *         console.log(`Loaded ${subtopics.length} subtopics for topic:`, subtopics);
   *         
   *         // Can now proceed with question creation/filtering
   *         this.enableQuestionOperations = true;
   *       },
   *       error: (error) => console.error('Failed to load subtopics:', error)
   *     });
   *   }
   * }
   * ```
   */
  /** Get subtopics for a topic */
  getSubtopics(topicId: string): Observable<Subtopic[]> {
    return this.http.get<Subtopic[]>(`${this.base}/subtopic`, {
      params: new HttpParams().set('topicId', topicId)
    });
  }
}
