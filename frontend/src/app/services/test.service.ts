/** * @fileoverview Test Service for NexPrepAI Frontend Application
 * @description Comprehensive service for managing test series, test attempts, progress tracking,
 * and review functionality in the NexPrepAI student application.
 * @module TestService
 * @requires @angular/core
 * @requires @angular/common/http
 * @requires rxjs
 * @author NexPrepAI Development Team
 * @since 1.0.0
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * @interface TestSeries
 * @description Represents a test series with complete configuration details
 */
export interface TestSeries {
  /** Unique identifier for the test series */
  _id: string;
  /** Display title of the test series */
  title: string;  /** Test mode determining availability and behavior */
  mode:       'official' | 'practice' | 'live' | 'strict';  // ★ Added 'strict' mode
  /** Maximum number of attempts allowed per user */
  maxAttempts: number;                           // ★
  /** Test availability start time (ISO date string) */
  startAt:    string;                            // ISO date string
  /** Test availability end time (ISO date string) */
  endAt:      string;                            // ISO date string
  /** Academic year for the test */
  year?: number;
  /** Whether to show public leaderboard */
  enablePublicLeaderboard?: boolean; // Added this field  /** Exam family information */
  family: {
    /** Family unique identifier */
    _id: string;
    /** Family display name */
    name: string;
    /** Family code */
    code: string;
  };
  /** Exam stream information */
  stream: {
    /** Stream unique identifier */
    _id: string;
    /** Stream display name */
    name: string;
    /** Stream code */
    code: string;
  };
  /** Exam paper information */
  paper: {
    /** Paper unique identifier */
    _id: string;
    /** Paper display name */
    name: string;
    /** Paper code */
    code: string;
  };
  /** Exam shift information */
  shift?: {
    /** Shift unique identifier */
    _id: string;
    /** Shift display name */
    name: string;
    /** Shift code */
    code: string;
  };
  // any other fields you need
}

/**
 * @interface StartTestResponse
 * @description Response when starting a new test attempt
 */
export interface StartTestResponse {
  /** Unique identifier for the test attempt */
  attemptId: string;
  /** Test duration in minutes */
  duration: number; // in minutes
  /** Array of questions for the test (optional) */
  questions?: any[]; // ← add this line
  /** Array of test sections (optional) */
  sections?: any[]; // your sections from the server
}

/**
 * @interface LeaderboardEntry
 * @description Represents a single entry in the test leaderboard
 */
export interface LeaderboardEntry {
  /** Position in the leaderboard */
  rank: number;
  /** Student's unique identifier */
  studentId?: string;  // Changed from nested studentInfo
  /** Student's display name */
  displayName: string; // Changed from nested studentInfo
  /** Student's profile photo URL */
  photoURL?: string;   // Optional
  /** Student's achieved score */
  score: number;
  /** Maximum possible score */
  maxScore: number;    // Changed from totalMarks to match backend
  /** Percentage score achieved */
  percentage: number;
  /** Test submission timestamp */
  submittedAt: string; // ISO date string
  /** Time taken to complete test in seconds */
  timeTakenSeconds?: number; // Made optional
}

/**
 * @class TestService
 * @description Angular service for managing all test-related operations in the NexPrepAI frontend.
 * Handles test series retrieval, test attempts, progress tracking, submissions, and review functionality.
 * 
 * @example
 * ```typescript
 * constructor(private testService: TestService) {}
 * 
 * // Load available test series
 * this.testService.getSeries().subscribe(series => {
 *   this.availableTests = series.filter(s => s.mode === 'practice');
 * });
 * 
 * // Start a new test
 * this.testService.startTest(seriesId).subscribe(response => {
 *   this.attemptId = response.attemptId;
 *   this.duration = response.duration;
 *   this.router.navigate(['/exam-player', this.attemptId]);
 * });
 * 
 * // Save progress during test
 * this.testService.saveProgress(attemptId, {
 *   responses: this.userResponses,
 *   currentSection: this.currentSectionIndex
 * }).subscribe();
 * ```
 */
@Injectable({ providedIn: 'root' })
export class TestService {  /** @private Base API URL for all test-related endpoints */
  private base = environment.apiUrl;

  /**
   * @constructor
   * @description Initializes the TestService with HTTP client dependency
   * @param {HttpClient} http - Angular HTTP client for API communication
   */  constructor(private http: HttpClient) {
    this.base = environment.apiUrl;
  }
  /**
   * @method getSeries
   * @description Retrieves all available test series for the current user
   * @returns {Observable<TestSeries[]>} Observable containing array of test series
   * @throws {HttpErrorResponse} When server error occurs or network connectivity issues
   * 
   * @example
   * ```typescript
   * this.testService.getSeries().subscribe({
   *   next: (series) => {
   *     // Filter and categorize test series
   *     this.practiceTests = series.filter(s => s.mode === 'practice');
   *     this.officialTests = series.filter(s => s.mode === 'official');
   *     this.liveTests = series.filter(s => s.mode === 'live');
   *     
   *     console.log(`Loaded ${series.length} test series`);
   *   },
   *   error: (error) => console.error('Failed to load test series:', error)
   * });
   * ```
   */
  // → New: fetch all test series
  getSeries(): Observable<TestSeries[]> {
    return this.http.get<TestSeries[]>(`${this.base}/testSeries`);
  }

  /**
   * @method startTest
   * @description Initiates a new test attempt for the specified test series
   * @param {string} seriesId - Unique identifier of the test series to start
   * @returns {Observable<StartTestResponse>} Observable containing test start response with attempt details
   * @throws {HttpErrorResponse} When test is not available, max attempts exceeded, or validation errors
   * 
   * @example
   * ```typescript
   * this.testService.startTest('605c7b9f1a2b3c4d5e6f7890').subscribe({
   *   next: (response) => {
   *     this.attemptId = response.attemptId;
   *     this.testDuration = response.duration;
   *     this.questions = response.questions || [];
   *     this.sections = response.sections || [];
   *     
   *     // Navigate to exam player
   *     this.router.navigate(['/exam-player', this.attemptId]);
   *     console.log(`Test started: Attempt ID ${this.attemptId}, Duration: ${this.testDuration} minutes`);
   *   },
   *   error: (error) => {
   *     if (error.status === 403) {
   *       this.showMessage('Maximum attempts reached for this test');
   *     } else {
   *       console.error('Failed to start test:', error);
   *     }
   *   }
   * });
   * ```
   */
  // → New: start a test
  startTest(seriesId: string): Observable<StartTestResponse> {
    return this.http.post<StartTestResponse>(
      `${this.base}/tests/start`,
      { seriesId }
    );
  }

  /**
   * @method saveProgress
   * @description Saves the current test progress including responses and navigation state
   * @param {string} attemptId - Unique identifier of the test attempt
   * @param {any} payload - Progress data including responses and current state
   * @param {any[]} [payload.responses] - Array of user responses to questions
   * @param {number} [payload.currentSection] - Current section index
   * @param {number} [payload.currentQuestion] - Current question index
   * @param {number} [payload.timeSpent] - Time spent so far in seconds
   * @returns {Observable<any>} Observable containing save confirmation
   * @throws {HttpErrorResponse} When attempt not found or server error occurs
   * 
   * @example
   * ```typescript
   * // Auto-save progress every 30 seconds
   * const progressData = {
   *   responses: this.userResponses,
   *   currentSection: this.currentSectionIndex,
   *   currentQuestion: this.currentQuestionIndex,
   *   timeSpent: this.getElapsedTimeSeconds()
   * };
   * 
   * this.testService.saveProgress(this.attemptId, progressData).subscribe({
   *   next: () => {
   *     this.lastSavedAt = new Date();
   *     console.log('Progress saved successfully');
   *   },
   *   error: (error) => console.error('Failed to save progress:', error)
   * });
   * ```
   */
  // → New: save progress
  saveProgress(attemptId: string, payload: any): Observable<any> {
    return this.http.post<any>(
      `${this.base}/tests/${attemptId}/save`,
      payload
    );
  }
  /**
   * @method getProgress
   * @description Retrieves the current progress of an in-progress test attempt
   * @param {string} seriesId - Unique identifier of the test series
   * @returns {Observable<Object>} Observable containing progress details
   * @throws {HttpErrorResponse} When no active attempt found or server error occurs
   * 
   * @example
   * ```typescript
   * // Check for existing test attempt when entering test page
   * this.testService.getProgress(seriesId).subscribe({
   *   next: (progress) => {
   *     if (progress.attemptId && progress.status === 'in-progress') {
   *       // Resume existing attempt
   *       this.attemptId = progress.attemptId;
   *       this.remainingTime = progress.remainingDurationSeconds;
   *       this.userResponses = progress.responses || [];
   *       this.currentSection = progress.currentSection || 0;
   *       
   *       console.log(`Resuming test: ${this.remainingTime} seconds remaining`);
   *       this.startTimer();
   *     } else if (progress.status === 'expired') {
   *       this.showMessage('Your test session has expired');
   *       this.router.navigate(['/tests']);
   *     }
   *   },
   *   error: (error) => {
   *     if (error.status === 404) {
   *       // No active attempt - can start new test
   *       this.canStartNewTest = true;
   *     }
   *   }
   * });
   * ```
   */
  /** Fetch an in-progress attempt, if any */
  getProgress(seriesId: string) {
    return this.http.get<{
      attemptId?: string;
      remainingDurationSeconds?: number; // Renamed from remainingTime and made optional
      sections?: any[];
      responses?: any[];
      status?: 'in-progress' | 'expired' | 'completed'; // Added status
      duration?: number; // Added duration (total test duration in minutes)
      expired?: boolean; // Kept for backward compatibility if still used, but prefer status
      startedAt?: string; // Added from backend response
      expiresAt?: string; // Added from backend response
      lastSavedAt?: string; // Added from backend response
    }>(`${this.base}/tests/${seriesId}/progress`);
  }

  /**
   * @method reviewAttempt
   * @description Reviews a completed test attempt (legacy method - use getReview instead)
   * @param {string} attemptId - Unique identifier of the test attempt to review
   * @returns {Observable<any>} Observable containing review data
   * @deprecated Use getReview() or getEnhancedReview() instead
   * @throws {HttpErrorResponse} When attempt not found or not completed
   * 
   * @example
   * ```typescript
   * // Legacy usage - prefer getReview() instead
   * this.testService.reviewAttempt(attemptId).subscribe(review => {
   *   this.reviewData = review;
   * });
   * ```
   */
  // existing methods…
  reviewAttempt(attemptId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/tests/${attemptId}/review`);
  }

  /**
   * @method getMyAttempts
   * @description Retrieves all test attempts made by the current user
   * @returns {Observable<any[]>} Observable containing array of user's test attempts
   * @throws {HttpErrorResponse} When server error occurs
   * 
   * @example
   * ```typescript
   * this.testService.getMyAttempts().subscribe({
   *   next: (attempts) => {
   *     this.testHistory = attempts.map(attempt => ({
   *       ...attempt,
   *       formattedDate: new Date(attempt.submittedAt).toLocaleDateString(),
   *       percentageScore: (attempt.score / attempt.maxScore * 100).toFixed(1)
   *     }));
   *     
   *     console.log(`User has ${attempts.length} test attempts`);
   *   },
   *   error: (error) => console.error('Failed to load test history:', error)
   * });
   * ```
   */
  getMyAttempts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/tests/my-attempts`);
  }

  /**
   * @method submitAttempt
   * @description Submits a completed test attempt for final scoring
   * @param {string} attemptId - Unique identifier of the test attempt
   * @param {any} payload - Final submission data including all responses
   * @param {any[]} payload.responses - Complete array of user responses
   * @param {boolean} [payload.forceSubmit] - Whether to force submit even if time remaining
   * @returns {Observable<any>} Observable containing submission confirmation and score
   * @throws {HttpErrorResponse} When attempt not found, already submitted, or validation errors
   * 
   * @example
   * ```typescript
   * // Submit test when time expires or user clicks submit
   * const submissionData = {
   *   responses: this.finalResponses,
   *   forceSubmit: this.timeExpired,
   *   submissionTime: new Date().toISOString()
   * };
   * 
   * this.testService.submitAttempt(this.attemptId, submissionData).subscribe({
   *   next: (result) => {
   *     this.finalScore = result.score;
   *     this.maxScore = result.maxScore;
   *     this.percentage = result.percentage;
   *     
   *     console.log(`Test submitted: ${this.finalScore}/${this.maxScore} (${this.percentage}%)`);
   *     this.router.navigate(['/review', this.attemptId]);
   *   },
   *   error: (error) => {
   *     console.error('Failed to submit test:', error);
   *     this.showErrorMessage('Failed to submit test. Please try again.');
   *   }
   * });
   * ```
   */
submitAttempt(attemptId: string, payload: any): Observable<any> {
    return this.http.post<any>(
      `${this.base}/tests/${attemptId}/submit`,
      payload
    );
  }

  /**
   * @method getReview
   * @description Retrieves detailed review information for a completed test attempt
   * @param {string} attemptId - Unique identifier of the test attempt to review
   * @returns {Observable<any>} Observable containing comprehensive review data
   * @throws {HttpErrorResponse} When attempt not found or not completed
   * 
   * @example
   * ```typescript
   * this.testService.getReview(attemptId).subscribe({
   *   next: (review) => {
   *     this.reviewData = review;
   *     this.questions = review.questions;
   *     this.userResponses = review.responses;
   *     this.sectionAnalysis = review.sectionAnalysis;
   *     this.overallStats = review.statistics;
   *     
   *     console.log('Review loaded:', review.score, '/', review.maxScore);
   *   },
   *   error: (error) => console.error('Failed to load review:', error)
   * });
   * ```
   */
  /** New: fetch review details for an attempt */  
  getReview(attemptId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/tests/${attemptId}/review`);
  }

  /**
   * @method getEnhancedReview
   * @description Retrieves enhanced review with detailed analytics and insights
   * @param {string} attemptId - Unique identifier of the test attempt
   * @returns {Observable<any>} Observable containing enhanced review with detailed analytics
   * @throws {HttpErrorResponse} When attempt not found or analytics not available
   * 
   * @example
   * ```typescript
   * this.testService.getEnhancedReview(attemptId).subscribe({
   *   next: (enhancedReview) => {
   *     this.detailedAnalysis = enhancedReview.analysis;
   *     this.strengthsWeaknesses = enhancedReview.insights;
   *     this.topicPerformance = enhancedReview.topicAnalysis;
   *     this.difficultyAnalysis = enhancedReview.difficultyBreakdown;
   *     
   *     console.log('Enhanced review loaded with detailed analytics');
   *   },
   *   error: (error) => console.error('Failed to load enhanced review:', error)
   * });
   * ```
   */
  // Enhanced Review Page Methods - Phase 1.2
  getEnhancedReview(attemptId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/tests/${attemptId}/enhanced-review`);
  }

  /**
   * @method getPerformanceAnalytics
   * @description Retrieves detailed performance analytics for a test attempt
   * @param {string} attemptId - Unique identifier of the test attempt
   * @returns {Observable<any>} Observable containing performance analytics data
   * @throws {HttpErrorResponse} When attempt not found or analytics not available
   * 
   * @example
   * ```typescript
   * this.testService.getPerformanceAnalytics(attemptId).subscribe({
   *   next: (analytics) => {
   *     this.timeAnalysis = analytics.timeSpent;
   *     this.accuracyTrends = analytics.accuracy;
   *     this.comparisonData = analytics.peerComparison;
   *     this.progressTracking = analytics.improvement;
   *     
   *     console.log('Performance analytics loaded');
   *   },
   *   error: (error) => console.error('Failed to load analytics:', error)
   * });
   * ```
   */
  getPerformanceAnalytics(attemptId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/tests/${attemptId}/analytics`);
  }

  /**
   * @method getStudyRecommendations
   * @description Retrieves personalized study recommendations based on test performance
   * @param {string} attemptId - Unique identifier of the test attempt
   * @returns {Observable<any>} Observable containing study recommendations
   * @throws {HttpErrorResponse} When attempt not found or recommendations not available
   * 
   * @example
   * ```typescript
   * this.testService.getStudyRecommendations(attemptId).subscribe({
   *   next: (recommendations) => {
   *     this.suggestedTopics = recommendations.topics;
   *     this.practiceQuestions = recommendations.questions;
   *     this.studyPlan = recommendations.plan;
   *     this.resourceLinks = recommendations.resources;
   *     
   *     console.log(`${recommendations.topics.length} topics recommended for improvement`);
   *   },
   *   error: (error) => console.error('Failed to load recommendations:', error)
   * });
   * ```
   */
  getStudyRecommendations(attemptId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/tests/${attemptId}/recommendations`);
  }

  /**
   * @method getLeaderboard
   * @description Retrieves leaderboard data for a specific test series
   * @param {string} seriesId - Unique identifier of the test series
   * @returns {Observable<Object>} Observable containing leaderboard with rankings and metadata
   * @throws {HttpErrorResponse} When series not found or leaderboard not available
   * 
   * @example
   * ```typescript
   * this.testService.getLeaderboard(seriesId).subscribe({
   *   next: (data) => {
   *     this.leaderboardEntries = data.leaderboard;
   *     this.testTitle = data.title;
   *     this.leaderboardMessage = data.message;
   *     
   *     // Find current user's position
   *     const userEntry = this.leaderboardEntries.find(entry => 
   *       entry.studentId === this.currentUserId
   *     );
   *     this.userRank = userEntry?.rank;
   *     
   *     console.log(`Leaderboard loaded: ${this.leaderboardEntries.length} entries`);
   *   },
   *   error: (error) => {
   *     if (error.status === 403) {
   *       this.showMessage('Leaderboard not available for this test');
   *     } else {
   *       console.error('Failed to load leaderboard:', error);
   *     }
   *   }
   * });
   * ```
   */
  getLeaderboard(seriesId: string): Observable<{leaderboard: LeaderboardEntry[], title: string, message?: string}> {
    return this.http.get<{leaderboard: LeaderboardEntry[], title: string, message?: string}>(`${this.base}/tests/leaderboard/${seriesId}`);
  }
}