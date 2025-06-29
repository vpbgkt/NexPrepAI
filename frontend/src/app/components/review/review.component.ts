/**
 * @fileoverview Review Component for NexPrepAI Frontend Application
 * @description Comprehensive Angular component for detailed post-exam review and analysis.
 * Provides advanced features for result visualization, question-wise analytics,
 * performance insights, progress tracking, and detailed answer explanations.
 * @module ReviewComponent
 * @requires @angular/core
 * @requires @angular/common
 * @requires @angular/forms
 * @requires @angular/router
 * @requires @angular/common/http
 * @requires TestService
 * @requires chart.js
 * @requires file-saver
 * @requires html2pdf.js
 * @author NexPrepAI Development Team
 * @since 1.0.0
 */

import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';
import { ActivatedRoute, Router }    from '@angular/router';
import { HttpClient }        from '@angular/common/http';
import { TestService }       from '../../services/test.service';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { saveAs } from 'file-saver';
import * as html2pdf from 'html2pdf.js/dist/html2pdf.bundle.js';
import { Location } from '@angular/common'; // Import Location

/**
 * @interface EnhancedReviewData
 * @description Complete review data structure with attempt details and analytics
 */
interface EnhancedReviewData {
  /** Test attempt information */
  attempt: {
    /** Attempt unique identifier */
    id: string;
    /** Test series title */
    seriesTitle: string;
    /** Score achieved */
    score: number;
    /** Maximum possible score */
    maxScore: number;
    /** Percentage score */
    percentage: number;
    /** Submission timestamp */
    submittedAt: string;
    /** Total time spent in exam */
    totalTimeSpent: number;
    /** Time spent per section */
    timePerSection: any[];
    /** Sequence of questions attempted */
    questionSequence: string[];
    /** Questions marked for review */
    flaggedQuestions: string[];
  };
  /** Test series information */
  series: {
    /** Series unique identifier */
    _id: string;
    /** Series unique identifier (alias) */
    id: string;
    /** Series title */
    title: string;
    /** Whether public leaderboard is enabled */
    enablePublicLeaderboard: boolean;
  };
  /** Question-wise review data */
  questions: QuestionReview[];
  /** Performance analytics */
  analytics: PerformanceAnalytics;
}

/**
 * @interface QuestionReview
 * @description Detailed review data for individual questions
 */
interface QuestionReview {
  /** Question unique identifier */
  questionId: string;
  /** Question text content */
  questionText: string;
  /** Question type (single, multiple, integer, numerical, matrix) */
  type?: string;
  /** Available answer options */
  options: { _id?: string; id?: string; text: string; [key: string]: any }[];
  /** Answer explanations */
  explanations: { content?: string; text?: string }[];
  /** Question difficulty level */
  difficulty: string;
  /** Estimated time to solve (in seconds) */
  estimatedTime: number;
  /** Subject classification */
  topics: {
    /** Subject name */
    subject: string;
    /** Topic name */
    topic: string;
    /** Subtopic name */
    subTopic: string;
  };
  /** Associated tags */
  tags: string[];
  /** User's selected answer (array of option IDs) */
  selectedAnswer: string[];
  /** Correct answer (array of correct option IDs) */
  correctAnswer: string[];
  /** Marks earned for this question */
  earned: number;
  /** Question status (correct, incorrect, unanswered) */
  status: string;
  /** Time spent on this question (in seconds) */
  timeSpent: number;
  /** Number of attempts on this question */
  attempts: number;
  /** Whether question was flagged for review */
  flagged: boolean;
  /** User's confidence level (1-5) */
  confidence: number;
  /** Whether the answer was correct */
  isCorrect: boolean;
  /** Total marks for this question */
  marks: number;
  /** Historical performance on this question */
  questionHistory?: { date: string; outcome: string; timeTaken: number }[];
  /** Feedback messages */
  feedback?: { type: string; text: string }[];

  // Enhanced review display properties
  /** Text of user's selected options */
  userSelectedOptionTexts?: string[];
  /** Text of correct options */
  correctOptionTexts?: string[];
  /** Definitive correct option IDs */
  actualCorrectOptionIds?: string[];
  /** Indices of selected answers */
  selectedAnswerIndices?: number[];
  
  // NAT-specific properties
  /** User's numerical answer for NAT questions */
  userNumericalAnswer?: number | null;
  /** Correct numerical answer for NAT questions */
  correctNumericalAnswer?: number | string | null;
}

/**
 * @interface PerformanceAnalytics
 * @description Comprehensive performance analytics and insights
 */
interface PerformanceAnalytics {
  /** Overall performance metrics */
  overall: {
    /** Total number of questions */
    totalQuestions: number;
    /** Number of correct answers */
    correctAnswers: number;
    /** Number of incorrect answers */
    incorrectAnswers: number;
    /** Number of unanswered questions */
    unanswered: number;
    /** Accuracy percentage */
    accuracy: number;
    /** Total time spent */
    timeSpent: number;
    /** Average time per question */
    averageTimePerQuestion: number;
    /** Number of flagged questions */
    flaggedCount: number;
  };
  /** Total questions count */
  totalQuestions: number;
  /** Performance breakdown by difficulty */
  difficultyBreakdown: any;
  /** Performance breakdown by subject */
  subjectBreakdown: any;
  /** Subject-wise performance data */
  subjectPerformance?: any[];
  /** Time analysis metrics */
  timeAnalysis: any;
  /** Performance insights and recommendations */
  performanceInsights?: any[];
  /** Areas requiring priority attention */
  priorityAreas?: any[];
  /** Time management suggestions */
  timeManagementTips?: any[];
  strengths?: any[];
  practiceRecommendations?: any[];
  studySchedule?: any[];
  nextSteps?: any[];
}

/**
 * @class ReviewComponent
 * @description Comprehensive post-examination review and analysis component providing detailed
 * performance insights, question-by-question analysis, interactive charts, and personalized
 * study recommendations. Features advanced analytics visualization and progress tracking.
 * 
 * @implements {OnInit} Angular lifecycle interface for component initialization
 * @implements {AfterViewInit} Angular lifecycle interface for post-view initialization
 * @implements {OnDestroy} Angular lifecycle interface for component cleanup
 * 
 * @example
 * ```typescript
 * // Component handles complete review workflow:
 * // 1. Loads comprehensive review data from backend
 * // 2. Processes performance analytics and recommendations
 * // 3. Renders interactive charts and visualizations
 * // 4. Provides question navigation and detailed explanations
 * // 5. Generates personalized study recommendations
 * 
 * // Usage in routing:
 * { path: 'review/:attemptId', component: ReviewComponent }
 * 
 * // Features:
 * // - Multi-tab interface (Overview, Questions, Analytics, Recommendations)
 * // - Interactive Chart.js visualizations
 * // - Question filtering and navigation
 * // - PDF export functionality
 * // - Detailed answer explanations
 * // - Performance insights and study recommendations
 * ```
 *  * @since 1.0.0
 * @author NexPrepAI Development Team
 */
@Component({
    selector: 'app-review',
    imports: [CommonModule, FormsModule],
    templateUrl: './review.component.html'
})
export class ReviewComponent implements OnInit, AfterViewInit, OnDestroy {  /** @property {ElementRef<HTMLCanvasElement>} Chart canvas reference for accuracy visualization */
  @ViewChild('accuracyChart', { static: false }) accuracyChartRef!: ElementRef<HTMLCanvasElement>;
  
  /** @property {ElementRef<HTMLCanvasElement>} Chart canvas reference for time analysis visualization */
  @ViewChild('timeChart', { static: false }) timeChartRef!: ElementRef<HTMLCanvasElement>;
  
  /** @property {ElementRef<HTMLCanvasElement>} Chart canvas reference for difficulty analysis visualization */
  @ViewChild('difficultyChart', { static: false }) difficultyChartRef!: ElementRef<HTMLCanvasElement>;

  /** @property {string} Unique identifier for the test attempt being reviewed */
  attemptId!: string;
  
  /** @property {EnhancedReviewData | null} Comprehensive review data including questions and analytics */
  reviewData: EnhancedReviewData | null = null;
  
  /** @property {any} Performance analytics data for visualization and insights */
  performanceAnalytics: any = null;
  
  /** @property {any} Personalized study recommendations based on performance */
  studyRecommendations: any = null;
  
  /** @property {boolean} Loading state indicator for UI feedback */
  loading = true;
  
  /** @property {string | null} Error message for user feedback */
  error: string | null = null;

  /** @property {Chart} Chart.js instance for accuracy visualization */
  accuracyChart?: Chart;
  
  /** @property {Chart} Chart.js instance for time analysis visualization */
  timeChart?: Chart;
  
  /** @property {Chart} Chart.js instance for difficulty analysis visualization */
  difficultyChart?: Chart;
  
  /** @property {number} Current question index for navigation */
  currentQuestionIndex = 0;
  
  /** @property {string} Active tab identifier for multi-tab interface */
  activeTab = 'overview'; // overview, questions, analytics, recommendations
  
  /** @property {boolean} Controls explanation visibility for current question */
  showExplanation = false;
  
  /** @property {string} Question filter criteria for advanced filtering */
  filterBy = 'all'; // all, correct, incorrect, flagged, unanswered
  
  /** @property {boolean} PDF download state indicator */
  downloadingPdf = false;

  /** @property {boolean} Indicates if leaderboard is enabled for this test series */
  isLeaderboardEnabled = false;
  
  /** @property {string | null} Test series ID for leaderboard navigation */
  seriesId: string | null = null;

  /** @property {StringConstructor} Utility reference for template string operations */
  String = String;  /**
   * @constructor
   * @description Initializes the ReviewComponent with required dependencies for routing,
   * HTTP operations, and location services.
   * 
   * @param {ActivatedRoute} route - Angular ActivatedRoute for parameter extraction
   * @param {Router} router - Angular Router for navigation operations
   * @param {TestService} testSvc - Test service for review data API operations
   * @param {HttpClient} http - Angular HttpClient for HTTP operations
   * @param {Location} location - Angular Location service for browser navigation
   */
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testSvc: TestService,
    private http: HttpClient,
    private location: Location // Inject Location
  ) {}
  /**
   * @method ngOnInit
   * @description Component initialization lifecycle hook. Extracts attempt ID from route
   * parameters and initiates comprehensive review data loading process.
   * 
   * @example
   * ```typescript
   * // Automatically called by Angular framework
   * // 1. Extracts attemptId from route parameters
   * // 2. Validates attempt ID presence
   * // 3. Initiates review data loading workflow
   * // 4. Sets up error handling for missing parameters
   * ```
   */
  ngOnInit() {
    this.attemptId = this.route.snapshot.paramMap.get('attemptId')!;
    if (this.attemptId) { // Ensure attemptId is valid before loading
      this.loadReviewData();
    } else {
      this.error = 'Attempt ID is missing.';
      this.loading = false;
    }
  }
  /**
   * @method ngAfterViewInit
   * @description Post-view initialization lifecycle hook. Prepares chart canvas elements
   * for Chart.js initialization after DOM elements are fully rendered.
   * 
   * @example
   * ```typescript
   * // Called after Angular completes view initialization
   * // Charts are initialized conditionally based on:
   * // - Data availability
   * // - Active tab state
   * // - Canvas element readiness
   * ```
   */
  ngAfterViewInit() {
    // Charts will be initialized after data is loaded
  }  /**
   * @async
   * @method loadReviewData
   * @description Primary data loading method that fetches comprehensive review data from backend.
   * Handles data transformation, error recovery, and chart initialization coordination.
   * 
   * @throws {Error} When review data cannot be loaded or parsed
   * 
   * @example
   * ```typescript
   * await this.loadReviewData();
   * // Loads and processes:
   * // - Enhanced review data with question details
   * // - User responses and correct answers
   * // - Time tracking and performance metrics
   * // - Answer explanations and feedback
   * 
   * // Data transformation includes:
   * // - Array normalization for consistent processing
   * // - Default value assignment for missing fields
   * // - Type conversion for compatibility
   * ```
   */
  async loadReviewData() {
    this.loading = true;
    this.error = null;

    try {
      const reviewResponse = await this.testSvc.getEnhancedReview(this.attemptId).toPromise();
      this.reviewData = reviewResponse;

      // Extract leaderboard configuration and series ID
      if (this.reviewData?.series) {
        this.isLeaderboardEnabled = this.reviewData.series.enablePublicLeaderboard || false;
        this.seriesId = this.reviewData.series._id || this.reviewData.series.id || null;
      }

      if (this.reviewData && this.reviewData.questions) {
        this.reviewData.questions = this.reviewData.questions.map((q: any) => ({
          ...q,
          explanations: q.explanations && Array.isArray(q.explanations) ? q.explanations : [],
          estimatedTime: q.estimatedTime || 0, // Default to 0 if not present
          timeSpent: q.timeSpent || 0,
          // Ensure correctAnswer is an array for consistent checks
          correctAnswer: Array.isArray(q.actualCorrectOptionIds) ? q.actualCorrectOptionIds : (q.actualCorrectOptionIds ? [String(q.actualCorrectOptionIds)] : []),
          selectedAnswer: Array.isArray(q.selectedAnswer) ? q.selectedAnswer.map(String) : (q.selectedAnswer ? [String(q.selectedAnswer)] : []),
          questionHistory: q.questionHistory || [], // Initialize if not present
          feedback: q.feedback || [], // Initialize feedback if not present
          // Map new fields for displaying user's and correct answer texts
          userSelectedOptionTexts: q.userSelectedOptionTexts || [],
          correctOptionTexts: q.correctOptionTexts || [],
          actualCorrectOptionIds: q.actualCorrectOptionIds || [], // Ensure this is mapped
          selectedAnswerIndices: q.selectedAnswerIndices || [], // Ensure this is mapped
        }));
      } else {
        this.reviewData = null; // Set to null if data is not as expected
        this.error = 'Failed to load or parse review data.';
      }
      // Analytics and recommendations can be loaded separately or handled if not critical for initial view
      this.loadAuxiliaryData(); 

    } catch (error: any) {
      console.error('Error loading primary review data:', error);
      this.error = error?.error?.message || error?.message || 'Failed to load review data';
    } finally {
      this.loading = false;
      // Initialize charts if data is available and tab is analytics
      if (this.reviewData && this.activeTab === 'analytics') {
        setTimeout(() => this.initializeCharts(), 0); 
      }
    }
  }

  /**
   * @async
   * @method loadAuxiliaryData
   * @description Loads supplementary analytics and recommendation data in parallel.
   * Designed for graceful degradation when primary review data is essential but
   * analytics are enhancement features.
   * 
   * @example
   * ```typescript
   * await this.loadAuxiliaryData();
   * // Parallel loading of:
   * // - Performance analytics for chart visualization
   * // - Personalized study recommendations
   * // - Advanced insights and suggestions
   * 
   * // Graceful handling:
   * // - Non-critical failures logged but don't break UI
   * // - Charts initialize conditionally based on data availability
   * ```
   */
  async loadAuxiliaryData() {
    try {
      const [analyticsResponse, recommendationsResponse] = await Promise.all([
        this.testSvc.getPerformanceAnalytics(this.attemptId).toPromise(),
        this.testSvc.getStudyRecommendations(this.attemptId).toPromise()
      ]);
      this.performanceAnalytics = analyticsResponse;
      this.studyRecommendations = recommendationsResponse;

      // Initialize charts if data is available and tab is analytics
      if (this.performanceAnalytics && this.activeTab === 'analytics') {
        setTimeout(() => this.initializeCharts(), 0);
      }
    } catch (error) {
      console.warn('Failed to load auxiliary review data (analytics/recommendations):', error);
      // Decide if these errors should be displayed to the user or just logged
    }
  }
  /**
   * @method setActiveTab
   * @description Updates the active tab in the multi-tab interface and triggers
   * conditional chart initialization for analytics visualization.
   * 
   * @param {string} tab - Target tab identifier ('overview', 'questions', 'analytics', 'recommendations')
   * 
   * @example
   * ```typescript
   * // Switch to analytics tab
   * this.setActiveTab('analytics');
   * // Triggers: chart initialization if data is available
   * 
   * // Switch to questions tab
   * this.setActiveTab('questions');
   * // Provides: question-by-question detailed review
   * ```
   */
  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  /**
   * @method nextQuestion
   * @description Navigates to the next question in the review sequence with bounds checking.
   * Provides safe navigation through the question collection.
   * 
   * @example
   * ```typescript
   * this.nextQuestion();
   * // Safely increments currentQuestionIndex
   * // Handles end-of-list boundary gracefully
   * // Updates UI to show next question details
   * ```
   */
  nextQuestion() {
    if (this.reviewData && this.currentQuestionIndex < this.reviewData.questions.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  /**
   * @method prevQuestion
   * @description Navigates to the previous question in the review sequence with bounds checking.
   * Provides safe backward navigation through the question collection.
   * 
   * @example
   * ```typescript
   * this.prevQuestion();
   * // Safely decrements currentQuestionIndex
   * // Handles beginning-of-list boundary gracefully
   * // Updates UI to show previous question details
   * ```
   */
  prevQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  /**
   * @method goToQuestion
   * @description Directly navigates to a specific question by index and switches to questions tab.
   * Provides quick access to any question in the review collection.
   * 
   * @param {number} index - Target question index (0-based)
   * 
   * @example
   * ```typescript
   * // Jump to question 5
   * this.goToQuestion(4);
   * // Sets: currentQuestionIndex and activeTab to 'questions'
   * ```
   */
  goToQuestion(index: number) {
    this.currentQuestionIndex = index;
    this.activeTab = 'questions';
  }
  /**
   * @method goBack
   * @description Navigates back to the previous page using browser history.
   * Provides convenient return navigation for users.
   * 
   * @example
   * ```typescript
   * // Return to previous page
   * this.goBack();
   * // Uses: Angular Location service for browser back navigation
   * ```
   */
  goBack(): void {
    this.location.back();
  }
  
  /**
   * @method goToLeaderboard
   * @description Navigates to the leaderboard page for the current test series
   * 
   * @example
   * ```typescript
   * // Navigate to leaderboard if enabled
   * this.goToLeaderboard();
   * ```
   */
  goToLeaderboard(): void {
    if (this.seriesId) {
      this.router.navigate(['/leaderboard', this.seriesId]);
    }
  }
  /**
   * @method initializeCharts
   * @description Orchestrates the initialization of all Chart.js visualizations when conditions are met.
   * Ensures charts are only created when data is available and analytics tab is active.
   * 
   * @example
   * ```typescript
   * this.initializeCharts();
   * // Conditionally creates:
   * // - Accuracy doughnut chart
   * // - Time analysis bar/line chart
   * // - Difficulty breakdown chart
   * ```
   */  initializeCharts() {
    if (!this.reviewData?.analytics) {
      console.warn('Analytics data not available for chart initialization');
      return;
    }
    
    if (this.reviewData && this.activeTab === 'analytics') {
      setTimeout(() => {
        try {
          this.createAccuracyChart();
          this.createTimeAnalysisChart();
          this.createDifficultyChart();
        } catch (error) {
          console.error('Error initializing charts:', error);
        }
      }, 100);
    }
  }

  /**
   * @method createAccuracyChart
   * @description Creates an interactive doughnut chart visualizing answer accuracy distribution.
   * Displays correct, incorrect, and unanswered question counts with percentage calculations.
   * 
   * @example
   * ```typescript
   * this.createAccuracyChart();
   * // Creates: doughnut chart with segments for correct/incorrect/unanswered
   * // Features: hover effects, percentage tooltips, responsive design
   * // Colors: green (correct), red (incorrect), yellow (unanswered)
   * ```
   */  createAccuracyChart() {
    if (!this.accuracyChartRef?.nativeElement || !this.reviewData?.analytics?.overall) return;

    const ctx = this.accuracyChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const analytics = this.reviewData.analytics.overall;
    
    this.accuracyChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Correct', 'Incorrect', 'Unanswered'],
        datasets: [{
          data: [
            analytics.correctAnswers || 0,
            analytics.incorrectAnswers || 0,
            analytics.unanswered || 0
          ],
          backgroundColor: [
            '#28a745',
            '#dc3545',
            '#ffc107'
          ],
          borderWidth: 0,
          hoverBorderWidth: 3,
          hoverBorderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              font: {
                size: 14,
                weight: 'bold'
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = analytics.totalQuestions || 1;
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * @method createTimeAnalysisChart
   * @description Creates a combined bar and line chart comparing actual vs estimated time per question.
   * Provides insights into time management patterns and question complexity.
   * 
   * @example
   * ```typescript
   * this.createTimeAnalysisChart();
   * // Creates: bar chart (actual time) + line overlay (estimated time)
   * // Analysis: time efficiency, question difficulty correlation
   * // Insights: identifies time management strengths/weaknesses
   * ```
   */
  createTimeAnalysisChart() {
    if (!this.timeChartRef?.nativeElement || !this.reviewData) return;

    const ctx = this.timeChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Create time analysis data for each question
    const questions = this.reviewData.questions;
    const questionNumbers = questions.map((_, index) => `Q${index + 1}`);
    const timeTaken = questions.map(q => q.timeSpent);
    const estimatedTime = questions.map(q => q.estimatedTime || 120);

    this.timeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: questionNumbers,
        datasets: [
          {
            label: 'Time Taken (seconds)',
            data: timeTaken,
            backgroundColor: 'rgba(102, 126, 234, 0.8)',
            borderColor: 'rgba(102, 126, 234, 1)',
            borderWidth: 1
          },
          {
            label: 'Estimated Time (seconds)',
            data: estimatedTime,
            backgroundColor: 'rgba(255, 193, 7, 0.5)',
            borderColor: 'rgba(255, 193, 7, 1)',
            borderWidth: 1,
            type: 'line',
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Time (seconds)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Questions'
            }
          }
        },
        plugins: {
          legend: {
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        }
      }
    });
  }

  /**
   * @method createDifficultyChart
   * @description Creates a bar chart analyzing performance across different difficulty levels.
   * Shows correct answers vs total questions for Easy, Medium, and Hard categories.
   * 
   * @example
   * ```typescript
   * this.createDifficultyChart();
   * // Creates: grouped bar chart by difficulty level
   * // Displays: correct vs total questions per difficulty
   * // Calculates: accuracy percentage tooltips
   * // Insights: strength/weakness identification by difficulty
   * ```
   */
  createDifficultyChart() {
    if (!this.difficultyChartRef?.nativeElement || !this.reviewData) return;

    const ctx = this.difficultyChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const breakdown = this.reviewData.analytics.difficultyBreakdown;
    const difficulties = ['Very easy', 'Easy', 'Medium', 'Hard', 'Very hard'];
    const correctData = difficulties.map(d => breakdown[d]?.correct || 0);
    const totalData = difficulties.map(d => breakdown[d]?.total || 0);

    this.difficultyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: difficulties,
        datasets: [
          {
            label: 'Correct',
            data: correctData,
            backgroundColor: 'rgba(40, 167, 69, 0.8)',
            borderColor: 'rgba(40, 167, 69, 1)',
            borderWidth: 1
          },
          {
            label: 'Total',
            data: totalData,
            backgroundColor: 'rgba(108, 117, 125, 0.3)',
            borderColor: 'rgba(108, 117, 125, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Questions'
            }
          }
        },
        plugins: {
          legend: {
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const datasetLabel = context.dataset.label || '';
                const value = context.parsed.y;
                const difficulty = context.label;
                const total = breakdown[difficulty]?.total || 0;
                const correct = breakdown[difficulty]?.correct || 0;
                const percentage = total > 0 ? ((correct / total) * 100).toFixed(1) : '0';
                
                if (datasetLabel === 'Correct') {
                  return `${datasetLabel}: ${value} (${percentage}% accuracy)`;
                }
                return `${datasetLabel}: ${value}`;
              }
            }
          }
        }
      }
    });
  }
  /**
   * @method onTabChange
   * @description Handles tab switching with conditional chart initialization for analytics tab.
   * Ensures charts are properly rendered when analytics tab becomes active.
   * 
   * @param {string} tab - Target tab identifier
   * 
   * @example
   * ```typescript
   * this.onTabChange('analytics');
   * // Switches tab and initializes charts with slight delay for DOM readiness
   * ```
   */
  onTabChange(tab: string) {
    this.setActiveTab(tab);
    if (tab === 'analytics') {
      setTimeout(() => this.initializeCharts(), 100);
    }
  }
  /**
   * @method ngOnDestroy
   * @description Component cleanup lifecycle hook. Properly destroys Chart.js instances
   * to prevent memory leaks and canvas context conflicts.
   * 
   * @example
   * ```typescript
   * // Automatically called by Angular framework
   * // Cleanup includes:
   * // - Chart.js instance destruction
   * // - Canvas context cleanup
   * // - Memory leak prevention
   * ```
   */
  ngOnDestroy() {
    this.accuracyChart?.destroy();
    this.timeChart?.destroy();
    this.difficultyChart?.destroy();
  }  /**
   * @method formatTime
   * @description Converts seconds to human-readable MM:SS format with input validation.
   * Handles edge cases and provides consistent time display formatting.
   * 
   * @param {number} seconds - Time duration in seconds
   * @returns {string} Formatted time string in MM:SS format
   * 
   * @example
   * ```typescript
   * const timeStr = this.formatTime(125);
   * console.log(timeStr); // "2:05"
   * 
   * const invalidTime = this.formatTime(NaN);
   * console.log(invalidTime); // "0:00"
   * ```
   */  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.floor(Math.abs(seconds) % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * @method formatDate
   * @description Converts ISO date string to localized human-readable format.
   * 
   * @param {string} dateString - ISO date string to format
   * @returns {string} Localized date and time string
   * 
   * @example
   * ```typescript
   * const formatted = this.formatDate('2023-12-25T10:30:00Z');
   * console.log(formatted); // "12/25/2023, 10:30:00 AM" (US locale)
   * ```
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  /**
   * @method getQuestionStatus
   * @description Determines the status classification of a question for UI styling and filtering.
   * 
   * @param {QuestionReview} question - Question object to analyze
   * @returns {string} Status string ('unanswered', 'correct', 'incorrect')
   * 
   * @example
   * ```typescript
   * const status = this.getQuestionStatus(question);
   * // Used for CSS classes: class="status-{{getQuestionStatus(question)}}"
   * ```
   */
  getQuestionStatus(question: QuestionReview): string {
    if (question.status === 'unanswered') return 'unanswered';
    return question.isCorrect ? 'correct' : 'incorrect';
  }

  /**
   * @method getFilteredQuestions
   * @description Filters questions based on current filter criteria for focused review.
   * Supports multiple filter types for targeted analysis.
   * 
   * @returns {QuestionReview[]} Filtered array of questions matching current filter
   * 
   * @example
   * ```typescript
   * this.filterBy = 'incorrect';
   * const wrongQuestions = this.getFilteredQuestions();
   * // Returns only questions answered incorrectly
   * 
   * this.filterBy = 'flagged';
   * const flaggedQuestions = this.getFilteredQuestions();
   * // Returns only questions marked for review
   * ```
   */
  getFilteredQuestions(): QuestionReview[] {
    if (!this.reviewData) return [];
    
    switch (this.filterBy) {
      case 'correct':
        return this.reviewData.questions.filter(q => q.isCorrect);
      case 'incorrect':
        return this.reviewData.questions.filter(q => !q.isCorrect && q.status !== 'unanswered');
      case 'flagged':
        return this.reviewData.questions.filter(q => q.flagged);
      case 'unanswered':
        return this.reviewData.questions.filter(q => q.status === 'unanswered');
      default:
        return this.reviewData.questions;
    }
  }

  /**
   * @method getDifficultyColor
   * @description Returns appropriate Tailwind CSS color class for difficulty level display.
   * 
   * @param {string} difficulty - Difficulty level ('Easy', 'Medium', 'Hard')
   * @returns {string} Tailwind CSS color class
   * 
   * @example
   * ```typescript
   * const colorClass = this.getDifficultyColor('Hard');
   * console.log(colorClass); // "text-red-600"
   * // Used in template: [class]="getDifficultyColor(question.difficulty)"
   * ```
   */
  getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'Easy': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'Hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  /**
   * @method getCurrentQuestion
   * @description Safely retrieves the currently viewed question with bounds checking.
   * 
   * @returns {QuestionReview | null} Current question object or null if not available
   * 
   * @example
   * ```typescript
   * const currentQ = this.getCurrentQuestion();
   * if (currentQ) {
   *   console.log(`Question: ${currentQ.questionText}`);
   *   console.log(`Correct: ${currentQ.isCorrect}`);
   * }
   * ```
   */
  getCurrentQuestion(): QuestionReview | null {
    if (this.reviewData && this.reviewData.questions && this.reviewData.questions.length > this.currentQuestionIndex) {
      return this.reviewData.questions[this.currentQuestionIndex];
    }
    return null;
  }

  /**
   * @method toggleExplanation
   * @description Toggles the visibility of detailed explanations for the current question.
   * 
   * @example
   * ```typescript
   * // Called from template button
   * <button (click)="toggleExplanation()">
   *   {{ showExplanation ? 'Hide' : 'Show' }} Explanation
   * </button>
   * ```
   */
  toggleExplanation() {
    this.showExplanation = !this.showExplanation;
  }

  /**
   * @method getPerformanceLevel
   * @description Calculates overall performance level based on accuracy percentage.
   * Provides qualitative assessment of exam performance.
   * 
   * @returns {string} Performance level ('Excellent', 'Very Good', 'Good', 'Average', 'Needs Improvement', 'Unknown')
   * 
   * @example
   * ```typescript
   * const level = this.getPerformanceLevel();
   * console.log(level); // "Very Good" (for 85% accuracy)
   * 
   * // Performance thresholds:
   * // 100%: Excellent
   * // 75-99%: Very Good
   * // 50-74%: Good
   * // 25-49%: Average
   * // 0-24%: Needs Improvement
   * ```
   */
  getPerformanceLevel(): string {
    if (!this.performanceAnalytics || !this.performanceAnalytics.overall) return 'Unknown';

    const { overall } = this.performanceAnalytics;
    // Ensure overall.totalQuestions is not zero to avoid division by zero
    if (overall.totalQuestions === 0) return 'Unknown'; 
    const averageAccuracy = (overall.correctAnswers / overall.totalQuestions) * 100;

    if (averageAccuracy === 100) return 'Excellent';
    if (averageAccuracy >= 75) return 'Very Good';
    if (averageAccuracy >= 50) return 'Good';
    if (averageAccuracy >= 25) return 'Average';
    return 'Needs Improvement';
  }

  /**
   * @method getPerformanceLevelDescription
   * @description Provides detailed description and encouragement based on performance level.
   * 
   * @returns {string} Descriptive text with actionable feedback
   * 
   * @example
   * ```typescript
   * const description = this.getPerformanceLevelDescription();
   * console.log(description); // "Great job! You're performing very well."
   * // Used for motivational feedback in UI
   * ```
   */
  getPerformanceLevelDescription(): string {
    const level = this.getPerformanceLevel();
    switch (level) {
      case 'Excellent': return 'Outstanding performance! Keep up the excellent work.';
      case 'Very Good': return 'Great job! You\'re performing very well.';
      case 'Good': return 'Good performance with room for improvement.';
      case 'Average': return 'Average performance. Focus on weak areas.';
      case 'Needs Improvement': return 'Significant improvement needed. Create a focused study plan.';
      default: return 'Performance level unknown.';
    }
  }
  /**
   * @async
   * @method downloadReviewAsPdf
   * @description Generates and downloads comprehensive review as PDF using html2pdf.js library.
   * Handles dynamic import and provides user feedback during generation process.
   * 
   * @returns {Promise<void>} Promise that resolves when PDF generation completes
   * 
   * @example
   * ```typescript
   * await this.downloadReviewAsPdf();
   * // Generates: complete review with charts, questions, analytics
   * // Features: custom filename with attempt ID and date
   * // Handling: loading state, error recovery, user feedback
   * ```
   */
  async downloadReviewAsPdf(): Promise<void> {
    if (this.downloadingPdf) return;
    this.downloadingPdf = true;

    const element = document.querySelector('.review-content'); 
    if (!element) {
      console.error('Review content element not found for PDF generation.');
      this.downloadingPdf = false;
      alert('Could not generate PDF: Content area not found.');
      return;
    }

    try {
      // Use a dynamic import for html2pdf.js as it might not have standard type declarations
      const html2pdfModule = await import('html2pdf.js/dist/html2pdf.bundle.js'); // Using bundle to avoid further issues
      const html2pdf = html2pdfModule.default || html2pdfModule; // Handle different module export styles

      const options = {
        margin:       [0.5, 0.5, 0.5, 0.5], // inches
        filename:     `nexprepai-review-${this.attemptId}-${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, logging: false, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().from(element).set(options).save();
    } catch (error) {
      console.error('Error generating PDF with html2pdf.js:', error);
      alert('Failed to generate PDF. Please ensure you have a stable internet connection or try again later.');
    } finally {
      this.downloadingPdf = false;
    }
  }
  /**
   * @method isOptionSelected
   * @description Determines if a specific option was selected by the user for a question.
   * Handles both single and multiple selection scenarios with type safety.
   * 
   * @param {QuestionReview | null} question - Question to check
   * @param {string | undefined} optionId - Option ID to check for selection
   * @returns {boolean} True if option was selected by user
   * 
   * @example
   * ```typescript
   * const isSelected = this.isOptionSelected(question, 'option_a');
   * // Used for: UI highlighting, answer review display
   * // Handles: array normalization, type conversion, null safety
   * ```
   */
  isOptionSelected(question: QuestionReview | null, optionId: string | undefined): boolean {
    if (!question || typeof optionId === 'undefined') { // Check if optionId is undefined
      return false;
    }
    // Ensure selectedAnswer is treated as an array of strings
    const selectedAnswers = Array.isArray(question.selectedAnswer)
      ? question.selectedAnswer.map(String)
      : (question.selectedAnswer ? [String(question.selectedAnswer)] : []);
    return selectedAnswers.includes(optionId);
  }

  /**
   * @method isCorrectOption
   * @description Determines if a specific option is the correct answer for a question.
   * Essential for answer key display and correctness visualization.
   * 
   * @param {QuestionReview | null} question - Question to check
   * @param {string | undefined} optionId - Option ID to check for correctness
   * @returns {boolean} True if option is the correct answer
   * 
   * @example
   * ```typescript
   * const isCorrect = this.isCorrectOption(question, 'option_b');
   * // Used for: correct answer highlighting, explanation display
   * // Features: array normalization, string conversion, null safety
   * ```
   */
  isCorrectOption(question: QuestionReview | null, optionId: string | undefined): boolean {
    if (!question || typeof optionId === 'undefined') { // Check if optionId is undefined
      return false;
    }
    // Ensure actualCorrectOptionIds is treated as an array of strings
    const correctIds = Array.isArray(question.actualCorrectOptionIds)
      ? question.actualCorrectOptionIds.map(String)
      : (question.actualCorrectOptionIds ? [String(question.actualCorrectOptionIds)] : []);
    return correctIds.includes(optionId);
  }

  /**
   * @method getOptionClass
   * @description Generates appropriate CSS classes for option display based on selection and correctness.
   * Implements visual feedback system for answer review.
   * 
   * @param {QuestionReview | null} question - Question context
   * @param {string | undefined} optionId - Option ID for styling
   * @param {number} optionIndex - Option index (for future use)
   * @returns {string} Space-separated CSS class string
   * 
   * @example
   * ```typescript
   * const cssClass = this.getOptionClass(question, 'option_a', 0);
   * // Returns: "cursor-pointer py-2 px-4 rounded-md bg-green-100 text-green-800"
   * 
   * // Color coding:
   * // - Green: Selected and correct OR unselected but correct
   * // - Red: Selected but incorrect
   * // - Gray: Unselected and incorrect
   * ```
   */
  getOptionClass(question: QuestionReview | null, optionId: string | undefined, optionIndex: number): string {
    if (!question) return '';

    const isSelected = this.isOptionSelected(question, optionId);
    const isCorrect = this.isCorrectOption(question, optionId);

    let baseClass = 'cursor-pointer select-none relative py-2 px-4 rounded-md';
    let stateClass = '';

    if (isSelected && isCorrect) {
      stateClass = 'bg-green-100 text-green-800';
    } else if (isSelected) {
      stateClass = 'bg-red-100 text-red-800';
    } else if (isCorrect) {
      stateClass = 'bg-green-100 text-green-800';
    } else {
      stateClass = 'text-gray-900';
    }

    return `${baseClass} ${stateClass}`;
  }
  /**
   * @method showFullExplanation
   * @description Toggles detailed explanation visibility for all explanations of a question.
   * Manages explanation content display state.
   * 
   * @param {QuestionReview} question - Question whose explanations to toggle
   * 
   * @example
   * ```typescript
   * this.showFullExplanation(currentQuestion);
   * // Toggles all explanation content visibility for the question
   * ```
   */
  showFullExplanation(question: QuestionReview) {
    question.explanations.forEach((explanation) => {
      explanation.content = explanation.content === 'show' ? '' : 'show';
    });
  }
  /** @property {number[]} Navigation history stack for back/forward functionality */
  private historyStack: number[] = [];
  
  /** @property {number} Current position in navigation history */
  private historyIndex = -1;

  /**
   * @method navigateToQuestion
   * @description Advanced navigation with history tracking for back/forward functionality.
   * Maintains navigation history for enhanced user experience.
   * 
   * @param {number} index - Target question index
   * 
   * @example
   * ```typescript
   * this.navigateToQuestion(5);
   * // Navigates to question 6 and records in history
   * // Enables: back/forward navigation through visited questions
   * ```
   */
  navigateToQuestion(index: number) {
    if (index < 0 || index >= (this.reviewData?.questions.length || 0)) return;
    this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    this.historyStack.push(index);
    this.historyIndex++;
    this.currentQuestionIndex = index;
    this.activeTab = 'questions';
  }

  /**
   * @method navigateBack
   * @description Navigates to previous question in navigation history.
   * 
   * @example
   * ```typescript
   * this.navigateBack();
   * // Goes back to previously viewed question in history
   * ```
   */
  navigateBack() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.currentQuestionIndex = this.historyStack[this.historyIndex];
      this.activeTab = 'questions';
    }
  }

  /**
   * @method navigateForward
   * @description Navigates to next question in navigation history.
   * 
   * @example
   * ```typescript
   * this.navigateForward();
   * // Goes forward to next question in history (after going back)
   * ```
   */
  navigateForward() {
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyIndex++;
      this.currentQuestionIndex = this.historyStack[this.historyIndex];
      this.activeTab = 'questions';
    }
  }
  /**
   * @method calculateAccuracy
   * @description Calculates accuracy percentage from performance analytics data.
   * 
   * @param {PerformanceAnalytics} analytics - Performance analytics object
   * @returns {number} Accuracy percentage (0-100)
   * 
   * @example
   * ```typescript
   * const accuracy = this.calculateAccuracy(this.performanceAnalytics);
   * console.log(`Accuracy: ${accuracy.toFixed(1)}%`);
   * ```
   */
  calculateAccuracy(analytics: PerformanceAnalytics) {
    if (!analytics || analytics.totalQuestions === 0) return 0;
    return (analytics.overall.correctAnswers / analytics.totalQuestions) * 100;
  }
  /**
   * @method hasStudyRecommendations
   * @description Checks if study recommendations are available for display.
   * 
   * @returns {boolean} True if recommendations are available
   * 
   * @example
   * ```typescript
   * if (this.hasStudyRecommendations()) {
   *   // Display recommendations tab
   * }
   * ```
   */
  hasStudyRecommendations(): boolean {
    return this.studyRecommendations && this.studyRecommendations.length > 0;
  }
  /**
   * @method getStudyRecommendationTopics
   * @description Extracts topic names from study recommendations for display.
   * 
   * @returns {string[]} Array of recommended study topics
   * 
   * @example
   * ```typescript
   * const topics = this.getStudyRecommendationTopics();
   * console.log(topics); // ["Algebra", "Calculus", "Statistics"]
   * ```
   */
  getStudyRecommendationTopics(): string[] {
    if (!this.studyRecommendations) return [];
    return this.studyRecommendations.map((rec: any) => rec.topic);
  }

  /**
   * @method getSubjectPerformanceData
   * @description Retrieves subject-wise performance analytics for detailed analysis.
   * Falls back to review data if performance analytics not available.
   * 
   * @returns {any[]} Array of subject performance data
   * 
   * @example
   * ```typescript
   * const subjectData = this.getSubjectPerformanceData();
   * // Used for: subject-wise charts, performance breakdown
   * // Structure: [{subject: 'Math', correct: 8, total: 10, accuracy: 80}, ...]
   * ```
   */
  getSubjectPerformanceData(): any[] {
    return this.performanceAnalytics?.subjectPerformance || this.reviewData?.analytics?.subjectPerformance || [];
  }

  /**
   * @method getPerformanceInsights
   * @description Retrieves AI-generated performance insights and analysis.
   * Provides actionable feedback based on exam performance patterns.
   * 
   * @returns {any[]} Array of performance insights
   * 
   * @example
   * ```typescript
   * const insights = this.getPerformanceInsights();
   * // Returns: analytical insights, improvement suggestions, pattern recognition
   * ```
   */
  getPerformanceInsights(): any[] {
    // Assuming insights come from studyRecommendations or a dedicated part of analytics
    return this.studyRecommendations?.performanceInsights || this.performanceAnalytics?.performanceInsights || [];
  }
  /**
   * @method getPerformanceLevelIcon
   * @description Returns appropriate emoji icon for performance level visualization.
   * Provides quick visual feedback for performance assessment.
   * 
   * @returns {string} Emoji icon representing performance level
   * 
   * @example
   * ```typescript
   * const icon = this.getPerformanceLevelIcon();
   * console.log(icon); // "🏆" for Excellent, "👍" for Very Good, etc.
   * // Used in: performance badges, quick visual indicators
   * ```
   */
  getPerformanceLevelIcon(): string {
    const level = this.getPerformanceLevel();
    switch (level) {
      case 'Excellent': return '🏆';
      case 'Very Good': return '👍';
      case 'Good': return '😊';
      case 'Average': return '😐';
      case 'Needs Improvement': return '📉';
      default: return '❓';
    }
  }

  /**
   * @method getPriorityAreas
   * @description Retrieves priority study areas that need focused attention.
   * Based on performance analysis and weak topic identification.
   * 
   * @returns {any[]} Array of priority study areas
   * 
   * @example
   * ```typescript
   * const priorityAreas = this.getPriorityAreas();
   * // Returns: areas requiring immediate attention based on poor performance
   * // Structure: [{topic: 'Algebra', difficulty: 'High', urgency: 'Critical'}, ...]
   * ```
   */
  getPriorityAreas(): any[] {
    return this.studyRecommendations?.priorityAreas || this.performanceAnalytics?.priorityAreas || [];
  }

  /**
   * @method getTimeManagementTips
   * @description Retrieves personalized time management recommendations.
   * Based on time spent patterns and efficiency analysis.
   * 
   * @returns {any[]} Array of time management tips
   * 
   * @example
   * ```typescript
   * const timeTips = this.getTimeManagementTips();
   * // Returns: strategies for better time allocation during exams
   * // Examples: "Spend max 2 minutes per multiple choice", "Skip difficult questions initially"
   * ```
   */
  getTimeManagementTips(): any[] {
    return this.studyRecommendations?.timeManagementTips || this.performanceAnalytics?.timeManagementTips || [];
  }

  /**
   * @method getStrengths
   * @description Retrieves identified strengths and strong subject areas.
   * Provides positive reinforcement and confidence building data.
   * 
   * @returns {any[]} Array of identified strengths
   * 
   * @example
   * ```typescript
   * const strengths = this.getStrengths();
   * // Returns: areas where student performed well
   * // Used for: motivation, confidence building, strength-based learning
   * ```
   */
  getStrengths(): any[] {
    return this.studyRecommendations?.strengths || this.performanceAnalytics?.strengths || [];
  }

  /**
   * @method getPracticeRecommendations
   * @description Retrieves specific practice recommendations for improvement.
   * Tailored suggestions based on performance gaps and learning patterns.
   * 
   * @returns {any[]} Array of practice recommendations
   * 
   * @example
   * ```typescript
   * const practiceRecs = this.getPracticeRecommendations();
   * // Returns: specific practice activities, mock tests, targeted exercises
   * // Structure: [{type: 'Mock Test', subject: 'Math', difficulty: 'Medium'}, ...]
   * ```
   */
  getPracticeRecommendations(): any[] {
    return this.studyRecommendations?.practiceRecommendations || this.performanceAnalytics?.practiceRecommendations || [];
  }

  /**
   * @method getStudySchedule
   * @description Retrieves personalized study schedule recommendations.
   * Based on weak areas, time availability, and learning efficiency patterns.
   * 
   * @returns {any[]} Array of study schedule items
   * 
   * @example
   * ```typescript
   * const schedule = this.getStudySchedule();
   * // Returns: day-by-day study plan with topics and time allocation
   * // Structure: [{day: 'Monday', topics: ['Algebra'], duration: '2 hours'}, ...]
   * ```
   */
  getStudySchedule(): any[] {
    return this.studyRecommendations?.studySchedule || this.performanceAnalytics?.studySchedule || [];
  }

  /**
   * @method getNextSteps
   * @description Retrieves immediate next steps for continued improvement.
   * Actionable items prioritized by impact and feasibility.
   * 
   * @returns {any[]} Array of next step recommendations
   * 
   * @example
   * ```typescript
   * const nextSteps = this.getNextSteps();
   * // Returns: immediate actionable items for improvement
   * // Examples: "Review algebra basics", "Take practice test in calculus"
   * ```
   */
  getNextSteps(): any[] {
    return this.studyRecommendations?.nextSteps || this.performanceAnalytics?.nextSteps || [];
  }
  /**
   * @method isLoading
   * @description Checks if component is currently in loading state.
   * Used for conditional rendering of loading indicators.
   * 
   * @returns {boolean} True if data is being loaded
   * 
   * @example
   * ```typescript
   * if (this.isLoading()) {
   *   // Show loading spinner
   * }
   * ```
   */
  isLoading(): boolean {
    return this.loading;
  }

  /**
   * @method hasError
   * @description Checks if component has encountered an error state.
   * Used for conditional error message display.
   * 
   * @returns {boolean} True if error state exists
   * 
   * @example
   * ```typescript
   * if (this.hasError()) {
   *   // Show error message and retry option
   * }
   * ```
   */
  hasError(): boolean {
    return this.error !== null;
  }

  /**
   * @method getErrorMessage
   * @description Retrieves current error message for display.
   * Provides user-friendly error information.
   * 
   * @returns {string | null} Error message or null if no error
   * 
   * @example
   * ```typescript
   * const errorMsg = this.getErrorMessage();
   * if (errorMsg) {
   *   console.error('Review error:', errorMsg);
   * }
   * ```
   */
  getErrorMessage(): string | null {
    return this.error;
  }

  /**
   * @method retryLoadReviewData
   * @description Initiates retry of review data loading after error.
   * Resets error state and attempts fresh data load.
   * 
   * @example
   * ```typescript
   * // Called from error message retry button
   * <button (click)="retryLoadReviewData()">
   *   Try Again
   * </button>
   * ```
   */
  retryLoadReviewData() {
    this.loadReviewData();
  }

  /**
   * @method getScoreMessage
   * @description Returns appropriate message based on score percentage
   * @returns {string} Score message
   */
  getScoreMessage(): string {
    if (!this.reviewData?.attempt?.percentage) return '';
    
    const percentage = this.reviewData.attempt.percentage;
    
    if (percentage >= 80) {
      return 'Congratulations! Excellent Performance!';
    } else if (percentage >= 60) {
      return 'Congratulations! Great Job!';
    } else if (percentage >= 40) {
      return 'Pass - Good Effort!';
    } else {
      return 'Keep Practicing - You Can Do Better!';
    }
  }

  /**
   * @method getScoreMessageColor
   * @description Returns appropriate color class based on score percentage
   * @returns {string} CSS color class
   */
  getScoreMessageColor(): string {
    if (!this.reviewData?.attempt?.percentage) return 'text-gray-600';
    
    const percentage = this.reviewData.attempt.percentage;
    
    if (percentage >= 80) {
      return 'text-green-700';
    } else if (percentage >= 60) {
      return 'text-green-600';
    } else if (percentage >= 40) {
      return 'text-blue-600';
    } else {
      return 'text-orange-600';
    }
  }

  /**
   * @method getScoreBadgeColor
   * @description Returns appropriate background color class for score badge
   * @returns {string} CSS background color class
   */
  getScoreBadgeColor(): string {
    if (!this.reviewData?.attempt?.percentage) return 'bg-gray-100';
    
    const percentage = this.reviewData.attempt.percentage;
    
    if (percentage >= 80) {
      return 'bg-green-100';
    } else if (percentage >= 60) {
      return 'bg-green-50';
    } else if (percentage >= 40) {
      return 'bg-blue-50';
    } else {
      return 'bg-orange-50';
    }
  }

  /**
   * @method getDifficultyProgressWidth
   * @description Safely calculates progress width for difficulty breakdown
   * @param {string} difficulty - Difficulty level
   * @returns {number} Progress width percentage
   */
  getDifficultyProgressWidth(difficulty: string): number {
    const correct = this.reviewData?.analytics?.difficultyBreakdown?.[difficulty]?.correct || 0;
    const total = this.reviewData?.analytics?.difficultyBreakdown?.[difficulty]?.total || 0;
    return total > 0 ? (correct / total) * 100 : 0;
  }
}
