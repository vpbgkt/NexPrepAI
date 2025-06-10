/**
 * @fileoverview Test Series Service for NexPrep Admin Panel
 * @description Core service for comprehensive test series management in the admin panel.
 * Provides functionality for creating, updating, and managing test series with advanced
 * features including section configuration, question pooling, variant management,
 * and randomization capabilities.
 * @module TestSeriesService
 * @requires @angular/core
 * @requires @angular/common/http
 * @requires rxjs
 * @author NexPrep Development Team
 * @since 1.0.0
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * @interface TestSeries
 * @description Complete test series configuration with advanced features
 */
export interface TestSeries {
  /** Unique identifier for the test series */
  _id:         string;
  /** Display title of the test series */
  title:       string;
  /** Exam type identifier or populated object */
  examType:    string;    // or an object if you populate
  /** Test duration in minutes */
  duration:    number;
  /** Total marks available for the test */
  totalMarks:  number;
  /** Test mode (official, practice, live) */
  mode:        string;
  /** Maximum attempts allowed per user */
  maxAttempts: number;
  /** Test type classification */
  type:        string; // official, practice, live
  /** Academic year for the test */
  year:        number | null;
  /** Exam conducting body */
  examBody:    string | null;
  /** Test availability start time */
  startAt:     Date | null;
  /** Test availability end time */
  endAt:       Date | null;
  /** Exam family information - ObjectId reference or populated object */
  family:      { _id: string; name: string; } | string;
  /** Whether to randomize section order */
  randomizeSectionOrder?: boolean;
  /** Test sections configuration */
  sections?:   Array<{
    /** Section title */
    title: string;
    /** Section display order */
    order: number;
    /** Questions in the section */
    questions: Array<{
      /** Question ObjectId reference */
      question: string;
      /** Marks for correct answer */
      marks: number;
      /** Negative marks for incorrect answer */
      negativeMarks: number;
    }>;
    /** Question pool for random selection */
    questionPool?: string[];
    /** Number of questions to select from pool */
    questionsToSelectFromPool?: number;
    /** Whether to randomize question order in section */
    randomizeQuestionOrderInSection?: boolean;
  }>;
  /** Test variants for multi-form support */
  variants?: Array<{
    /** Variant code */
    code: string;
    /** Variant sections */
    sections: Array<{
      /** Section title */
      title: string;
      /** Section display order */
      order: number;
      /** Questions in the section */
      questions: Array<{
        /** Question ObjectId reference */
        question: string;
        /** Marks for correct answer */
        marks: number;
        /** Negative marks for incorrect answer */
        negativeMarks: number;
      }>;
      /** Question pool for random selection */
      questionPool?: string[];
      /** Number of questions to select from pool */
      questionsToSelectFromPool?: number;
      /** Whether to randomize question order in section */
      randomizeQuestionOrderInSection?: boolean;
    }>;
  }>;
}

/**
 * @class TestSeriesService
 * @description Core service for comprehensive test series management in the NexPrep admin panel.
 * Provides complete lifecycle management for test series including creation, updates,
 * listing, and advanced configuration capabilities with support for multi-section tests,
 * question pooling, variant management, and sophisticated randomization features.
 * 
 * @implements {Injectable}
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * // Basic usage - retrieve all test series
 * constructor(private testSeriesService: TestSeriesService) {}
 * 
 * // Load all test series
 * this.testSeriesService.getSeries().subscribe({
 *   next: (series) => {
 *     console.log('Available test series:', series.length);
 *     this.displaySeries = series;
 *   },
 *   error: (error) => console.error('Failed to load series:', error)
 * });
 * 
 * // Create new test series
 * const newSeries: Partial<TestSeries> = {
 *   title: 'JEE Main Mock Test 2024',
 *   duration: 180,
 *   totalMarks: 360,
 *   mode: 'practice',
 *   maxAttempts: 3,
 *   sections: [
 *     {
 *       title: 'Physics',
 *       order: 1,
 *       questions: [],
 *       questionsToSelectFromPool: 25,
 *       randomizeQuestionOrderInSection: true
 *     }
 *   ]
 * };
 * 
 * this.testSeriesService.create(newSeries).subscribe({
 *   next: (created) => console.log('Series created:', created.title),
 *   error: (error) => console.error('Creation failed:', error)
 * });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class TestSeriesService {  /** Base API endpoint for test series operations */
  private base = `${environment.apiUrl}/testSeries`;

  /**
   * @constructor
   * @description Initializes the TestSeriesService with HTTP client dependency
   * @param {HttpClient} http - Angular HTTP client for API communication
   */
  constructor(private http: HttpClient) {}

  /**
   * @method getSeries
   * @description Retrieves complete list of all test series with populated references
   * @returns {Observable<TestSeries[]>} Observable stream of test series array
   * 
   * @example
   * ```typescript
   * // Load and display all test series
   * this.testSeriesService.getSeries().subscribe({
   *   next: (series) => {
   *     console.log(`Loaded ${series.length} test series`);
   *     this.seriesList = series;
   *     this.groupSeriesByFamily();
   *   },
   *   error: (error) => {
   *     console.error('Failed to load test series:', error);
   *     this.showErrorMessage('Unable to load test series');
   *   }
   * });
   * ```
   */
  getSeries(): Observable<TestSeries[]> {
    return this.http.get<TestSeries[]>(this.base);
  }

  /**
   * @method create
   * @description Creates a new test series with comprehensive configuration
   * @param {Partial<TestSeries>} payload - Test series configuration data
   * @returns {Observable<TestSeries>} Observable of created test series
   * 
   * @example
   * ```typescript
   * // Create multi-section test with question pools
   * const testConfig: Partial<TestSeries> = {
   *   title: 'NEET Practice Test - Biology Focus',
   *   duration: 180,
   *   totalMarks: 720,
   *   mode: 'practice',
   *   maxAttempts: 5,
   *   randomizeSectionOrder: false,
   *   sections: [
   *     {
   *       title: 'Biology',
   *       order: 1,
   *       questions: [],
   *       questionPool: ['60f1b2c3d4e5f6789abcdef0', '60f1b2c3d4e5f6789abcdef1'],
   *       questionsToSelectFromPool: 45,
   *       randomizeQuestionOrderInSection: true
   *     },
   *     {
   *       title: 'Chemistry',
   *       order: 2,
   *       questions: [],
   *       questionPool: ['60f1b2c3d4e5f6789abcdef2', '60f1b2c3d4e5f6789abcdef3'],
   *       questionsToSelectFromPool: 45,
   *       randomizeQuestionOrderInSection: true
   *     }
   *   ]
   * };
   * 
   * this.testSeriesService.create(testConfig).subscribe({
   *   next: (created) => {
   *     console.log('Test series created successfully:', created._id);
   *     this.router.navigate(['/admin/test-series', created._id]);
   *   },
   *   error: (error) => {
   *     console.error('Failed to create test series:', error);
   *     this.handleCreationError(error);
   *   }
   * });
   * ```
   */
  create(payload: Partial<TestSeries>): Observable<TestSeries> {
    return this.http.post<TestSeries>(`${this.base}/create`, payload);
  }

  /**
   * @method update
   * @description Updates an existing test series with new configuration
   * @param {string} id - Test series unique identifier
   * @param {Partial<TestSeries>} payload - Updated test series data
   * @returns {Observable<TestSeries>} Observable of updated test series
   * 
   * @example
   * ```typescript
   * // Update test series timing and settings
   * const updates: Partial<TestSeries> = {
   *   startAt: new Date('2024-06-15T09:00:00Z'),
   *   endAt: new Date('2024-06-15T12:00:00Z'),
   *   maxAttempts: 2,
   *   mode: 'live'
   * };
   * 
   * this.testSeriesService.update(seriesId, updates).subscribe({
   *   next: (updated) => {
   *     console.log('Test series updated:', updated.title);
   *     this.refreshSeriesData();
   *   },
   *   error: (error) => {
   *     console.error('Update failed:', error);
   *     this.showUpdateError(error);
   *   }
   * });
   * 
   * // Add new section to existing test series
   * const newSection = {
   *   sections: [
   *     ...existingSeries.sections,
   *     {
   *       title: 'Mathematics',
   *       order: 3,
   *       questions: [],
   *       questionPool: mathQuestionIds,
   *       questionsToSelectFromPool: 30,
   *       randomizeQuestionOrderInSection: false
   *     }
   *   ]
   * };
   * 
   * this.testSeriesService.update(seriesId, newSection).subscribe({
   *   next: (updated) => console.log('Section added successfully'),
   *   error: (error) => console.error('Failed to add section:', error)
   * });
   * ```
   */
  update(id: string, payload: Partial<TestSeries>): Observable<TestSeries> {
    return this.http.put<TestSeries>(`${this.base}/${id}`, payload);
  }
}
