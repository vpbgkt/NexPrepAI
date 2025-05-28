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

interface EnhancedReviewData {
  attempt: {
    id: string;
    seriesTitle: string;
    score: number;
    maxScore: number;
    percentage: number;
    submittedAt: string;
    totalTimeSpent: number;
    timePerSection: any[];
    questionSequence: string[];
    flaggedQuestions: string[];
  };
  questions: QuestionReview[];
  analytics: PerformanceAnalytics;
}

interface QuestionReview {
  questionId: string;
  questionText: string;
  options: { _id?: string; id?: string; text: string; [key: string]: any }[];
  explanations: { content?: string; text?: string }[];
  difficulty: string;
  estimatedTime: number;
  topics: {
    subject: string;
    topic: string;
    subTopic: string;
  };
  tags: string[];
  selectedAnswer: string[]; // Should be array of option IDs
  correctAnswer: string[]; // Should be array of correct option IDs
  earned: number;
  status: string;
  timeSpent: number;
  attempts: number;
  flagged: boolean;
  confidence: number;
  isCorrect: boolean;
  marks: number;
  questionHistory?: { date: string; outcome: string; timeTaken: number }[];
  feedback?: { type: string; text: string }[];

  // Added for enhanced review display
  userSelectedOptionTexts?: string[];
  correctOptionTexts?: string[];
  actualCorrectOptionIds?: string[]; // Added to ensure we have the definitive correct option IDs
  selectedAnswerIndices?: number[]; // Added for potential index-based operations if needed
}

interface PerformanceAnalytics {
  overall: {
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    unanswered: number;
    accuracy: number;
    timeSpent: number;
    averageTimePerQuestion: number;
    flaggedCount: number;
  };
  totalQuestions: number;
  difficultyBreakdown: any;
  subjectBreakdown: any; // This might be the same as subjectPerformance or a different structure
  subjectPerformance?: any[]; // For subject-wise performance data
  timeAnalysis: any;
  // Add other properties based on template usage if they come from analytics
  performanceInsights?: any[];
  priorityAreas?: any[];
  timeManagementTips?: any[];
  strengths?: any[];
  practiceRecommendations?: any[];
  studySchedule?: any[];
  nextSteps?: any[];
}

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review.component.html',
  styleUrls: ['./review.component.scss']
})
export class ReviewComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('accuracyChart', { static: false }) accuracyChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('timeChart', { static: false }) timeChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('difficultyChart', { static: false }) difficultyChartRef!: ElementRef<HTMLCanvasElement>;

  attemptId!: string;
  reviewData: EnhancedReviewData | null = null;
  performanceAnalytics: any = null;
  studyRecommendations: any = null;
  loading = true;
  error: string | null = null;

  // Chart instances
  accuracyChart?: Chart;
  timeChart?: Chart;
  difficultyChart?: Chart;
  // UI State
  currentQuestionIndex = 0;
  activeTab = 'overview'; // overview, questions, analytics, recommendations
  showExplanation = false;
  filterBy = 'all'; // all, correct, incorrect, flagged, unanswered
  downloadingPdf = false;

  // Utility references for template
  String = String;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testSvc: TestService,
    private http: HttpClient,
    private location: Location // Inject Location
  ) {}
  ngOnInit() {
    this.attemptId = this.route.snapshot.paramMap.get('attemptId')!;
    if (this.attemptId) { // Ensure attemptId is valid before loading
      this.loadReviewData();
    } else {
      this.error = 'Attempt ID is missing.';
      this.loading = false;
    }
  }

  ngAfterViewInit() {
    // Charts will be initialized after data is loaded
  }  async loadReviewData() {
    this.loading = true;
    this.error = null;

    try {
      const reviewResponse = await this.testSvc.getEnhancedReview(this.attemptId).toPromise();
      this.reviewData = reviewResponse;

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

  // Navigation methods
  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  nextQuestion() {
    if (this.reviewData && this.currentQuestionIndex < this.reviewData.questions.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  prevQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  goToQuestion(index: number) {
    this.currentQuestionIndex = index;
    this.activeTab = 'questions';
  }

  // Method to go back
  goBack(): void {
    this.location.back();
  }

  // Chart initialization methods
  initializeCharts() {
    if (this.reviewData && this.activeTab === 'analytics') {
      this.createAccuracyChart();
      this.createTimeAnalysisChart();
      this.createDifficultyChart();
    }
  }

  createAccuracyChart() {
    if (!this.accuracyChartRef?.nativeElement || !this.reviewData) return;

    const ctx = this.accuracyChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const analytics = this.reviewData.analytics.overall;
    
    this.accuracyChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Correct', 'Incorrect', 'Unanswered'],
        datasets: [{
          data: [
            analytics.correctAnswers,
            analytics.incorrectAnswers,
            analytics.unanswered
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
                const total = analytics.totalQuestions;
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

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

  createDifficultyChart() {
    if (!this.difficultyChartRef?.nativeElement || !this.reviewData) return;

    const ctx = this.difficultyChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const breakdown = this.reviewData.analytics.difficultyBreakdown;
    const difficulties = ['Easy', 'Medium', 'Hard'];
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

  // Update chart visibility when switching tabs
  onTabChange(tab: string) {
    this.setActiveTab(tab);
    if (tab === 'analytics') {
      setTimeout(() => this.initializeCharts(), 100);
    }
  }

  // Cleanup charts
  ngOnDestroy() {
    this.accuracyChart?.destroy();
    this.timeChart?.destroy();
    this.difficultyChart?.destroy();
  }
  // Utility methods
  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getQuestionStatus(question: QuestionReview): string {
    if (question.status === 'unanswered') return 'unanswered';
    return question.isCorrect ? 'correct' : 'incorrect';
  }

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

  getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'Easy': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'Hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  getCurrentQuestion(): QuestionReview | null {
    if (this.reviewData && this.reviewData.questions && this.reviewData.questions.length > this.currentQuestionIndex) {
      return this.reviewData.questions[this.currentQuestionIndex];
    }
    return null;
  }

  toggleExplanation() {
    this.showExplanation = !this.showExplanation;
  }

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

  // PDF Download functionality

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
        filename:     `nexprep-review-${this.attemptId}-${new Date().toISOString().split('T')[0]}.pdf`,
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

  // Helper methods for template logic
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

  // Explanation toggling
  showFullExplanation(question: QuestionReview) {
    question.explanations.forEach((explanation) => {
      explanation.content = explanation.content === 'show' ? '' : 'show';
    });
  }

  // Navigation with history
  private historyStack: number[] = [];
  private historyIndex = -1;

  navigateToQuestion(index: number) {
    if (index < 0 || index >= (this.reviewData?.questions.length || 0)) return;
    this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    this.historyStack.push(index);
    this.historyIndex++;
    this.currentQuestionIndex = index;
    this.activeTab = 'questions';
  }

  navigateBack() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.currentQuestionIndex = this.historyStack[this.historyIndex];
      this.activeTab = 'questions';
    }
  }

  navigateForward() {
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyIndex++;
      this.currentQuestionIndex = this.historyStack[this.historyIndex];
      this.activeTab = 'questions';
    }
  }

  // Performance analytics methods
  calculateAccuracy(analytics: PerformanceAnalytics) {
    if (!analytics || analytics.totalQuestions === 0) return 0;
    return (analytics.overall.correctAnswers / analytics.totalQuestions) * 100;
  }

  // Study recommendation methods
  hasStudyRecommendations(): boolean {
    return this.studyRecommendations && this.studyRecommendations.length > 0;
  }

  getStudyRecommendationTopics(): string[] {
    if (!this.studyRecommendations) return [];
    return this.studyRecommendations.map((rec: any) => rec.topic);
  }

  // Performance analytics and study recommendation getters
  getSubjectPerformanceData(): any[] {
    return this.performanceAnalytics?.subjectPerformance || this.reviewData?.analytics?.subjectPerformance || [];
  }

  getPerformanceInsights(): any[] {
    // Assuming insights come from studyRecommendations or a dedicated part of analytics
    return this.studyRecommendations?.performanceInsights || this.performanceAnalytics?.performanceInsights || [];
  }

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

  // getPerformanceLevelText() is not strictly needed if getPerformanceLevel() returns the text.
  // The template can call getPerformanceLevel() directly.

  getPriorityAreas(): any[] {
    return this.studyRecommendations?.priorityAreas || this.performanceAnalytics?.priorityAreas || [];
  }

  getTimeManagementTips(): any[] {
    return this.studyRecommendations?.timeManagementTips || this.performanceAnalytics?.timeManagementTips || [];
  }

  getStrengths(): any[] {
    return this.studyRecommendations?.strengths || this.performanceAnalytics?.strengths || [];
  }

  getPracticeRecommendations(): any[] {
    return this.studyRecommendations?.practiceRecommendations || this.performanceAnalytics?.practiceRecommendations || [];
  }

  getStudySchedule(): any[] {
    return this.studyRecommendations?.studySchedule || this.performanceAnalytics?.studySchedule || [];
  }

  getNextSteps(): any[] {
    return this.studyRecommendations?.nextSteps || this.performanceAnalytics?.nextSteps || [];
  }

  // Miscellaneous methods
  isLoading(): boolean {
    return this.loading;
  }

  hasError(): boolean {
    return this.error !== null;
  }

  getErrorMessage(): string | null {
    return this.error;
  }

  retryLoadReviewData() {
    this.loadReviewData();
  }
}
