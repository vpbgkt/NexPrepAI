/**
 * @fileoverview Leaderboard Component
 * @description Component for displaying admin leaderboards including question
 * additions, exam paper creations, and combined metrics with time-based filtering
 * 
 * @author NexPrep Development Team
 * @since 1.0.0
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  LeaderboardService, 
  LeaderboardResponse, 
  CombinedLeaderboardResponse, 
  AdminStatsResponse,
  TimePeriod,
  LeaderboardEntry,
  CombinedLeaderboardEntry,
  AdminStats
} from '../../services/leaderboard.service';

@Component({
  selector: 'app-leaderboard',
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class LeaderboardComponent implements OnInit {
  // Current view state
  activeTab: 'questions' | 'examPapers' | 'combined' | 'stats' = 'combined';
  selectedPeriod: TimePeriod = 'alltime';
  
  // Loading states
  loading = {
    questions: false,
    examPapers: false,
    combined: false,
    stats: false
  };
  
  // Data storage
  questionLeaderboard: LeaderboardEntry[] = [];
  examPaperLeaderboard: LeaderboardEntry[] = [];
  combinedLeaderboard: CombinedLeaderboardEntry[] = [];
  adminStats: AdminStats[] = [];
  
  // Metadata
  questionMetadata = { totalCount: 0 };
  examPaperMetadata = { totalCount: 0 };
  combinedMetadata = { 
    totalQuestions: 0, 
    totalExamPapers: 0, 
    totalContributions: 0 
  };
  statsMetadata = {
    totalAdmins: 0,
    totalQuestions: 0,
    totalExamPapers: 0,
    totalContributions: 0
  };
  
  // Error handling
  error: string | null = null;
  
  // Configuration
  availablePeriods: Array<{ value: TimePeriod; label: string }> = [];

  constructor(private leaderboardService: LeaderboardService) {
    this.availablePeriods = this.leaderboardService.getAvailablePeriods();
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  /**
   * Load initial data for all tabs
   */
  private loadInitialData(): void {
    this.loadCombinedLeaderboard();
    this.loadAdminStats();
  }

  /**
   * Handle tab change
   */
  onTabChange(tab: 'questions' | 'examPapers' | 'combined' | 'stats'): void {
    this.activeTab = tab;
    this.error = null;
    
    switch (tab) {
      case 'questions':
        if (this.questionLeaderboard.length === 0) {
          this.loadQuestionLeaderboard();
        }
        break;
      case 'examPapers':
        if (this.examPaperLeaderboard.length === 0) {
          this.loadExamPaperLeaderboard();
        }
        break;
      case 'combined':
        if (this.combinedLeaderboard.length === 0) {
          this.loadCombinedLeaderboard();
        }
        break;
      case 'stats':
        if (this.adminStats.length === 0) {
          this.loadAdminStats();
        }
        break;
    }
  }

  /**
   * Handle period change
   */
  onPeriodChange(period: TimePeriod): void {
    this.selectedPeriod = period;
    this.error = null;
    
    // Reload current tab data
    switch (this.activeTab) {
      case 'questions':
        this.loadQuestionLeaderboard();
        break;
      case 'examPapers':
        this.loadExamPaperLeaderboard();
        break;
      case 'combined':
        this.loadCombinedLeaderboard();
        break;
      // Stats doesn't need period filter as it shows all periods
    }
  }

  /**
   * Load question leaderboard
   */
  loadQuestionLeaderboard(): void {
    this.loading.questions = true;
    this.error = null;
    
    this.leaderboardService.getQuestionLeaderboard(this.selectedPeriod)
      .subscribe({
        next: (response: LeaderboardResponse) => {
          if (response.success) {
            this.questionLeaderboard = response.data.leaderboard;
            this.questionMetadata.totalCount = response.data.totalCount;
          } else {
            this.error = response.message || 'Failed to load question leaderboard';
          }
          this.loading.questions = false;
        },
        error: (error) => {
          console.error('Error loading question leaderboard:', error);
          this.error = 'Failed to load question leaderboard. Please try again.';
          this.loading.questions = false;
        }
      });
  }

  /**
   * Load exam paper leaderboard
   */
  loadExamPaperLeaderboard(): void {
    this.loading.examPapers = true;
    this.error = null;
    
    this.leaderboardService.getExamPaperLeaderboard(this.selectedPeriod)
      .subscribe({
        next: (response: LeaderboardResponse) => {
          if (response.success) {
            this.examPaperLeaderboard = response.data.leaderboard;
            this.examPaperMetadata.totalCount = response.data.totalCount;
          } else {
            this.error = response.message || 'Failed to load exam paper leaderboard';
          }
          this.loading.examPapers = false;
        },
        error: (error) => {
          console.error('Error loading exam paper leaderboard:', error);
          this.error = 'Failed to load exam paper leaderboard. Please try again.';
          this.loading.examPapers = false;
        }
      });
  }

  /**
   * Load combined leaderboard
   */
  loadCombinedLeaderboard(): void {
    this.loading.combined = true;
    this.error = null;
    
    this.leaderboardService.getCombinedLeaderboard(this.selectedPeriod)
      .subscribe({
        next: (response: CombinedLeaderboardResponse) => {
          if (response.success) {
            this.combinedLeaderboard = response.data.leaderboard;
            this.combinedMetadata = {
              totalQuestions: response.data.totalQuestions,
              totalExamPapers: response.data.totalExamPapers,
              totalContributions: response.data.totalContributions
            };
          } else {
            this.error = response.message || 'Failed to load combined leaderboard';
          }
          this.loading.combined = false;
        },
        error: (error) => {
          console.error('Error loading combined leaderboard:', error);
          this.error = 'Failed to load combined leaderboard. Please try again.';
          this.loading.combined = false;
        }
      });
  }

  /**
   * Load admin statistics
   */
  loadAdminStats(): void {
    this.loading.stats = true;
    this.error = null;
    
    this.leaderboardService.getAdminStats()
      .subscribe({
        next: (response: AdminStatsResponse) => {
          if (response.success) {
            this.adminStats = response.data.admins;
            this.statsMetadata = response.data.summary;
          } else {
            this.error = response.message || 'Failed to load admin statistics';
          }
          this.loading.stats = false;
        },
        error: (error) => {
          console.error('Error loading admin statistics:', error);
          this.error = 'Failed to load admin statistics. Please try again.';
          this.loading.stats = false;
        }
      });
  }

  /**
   * Get formatted period display name
   */
  getPeriodDisplayName(period: TimePeriod): string {
    return this.leaderboardService.getPeriodDisplayName(period);
  }

  /**
   * Get rank badge class based on position
   */
  getRankBadgeClass(rank: number): string {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return 'rank-default';
  }

  /**
   * Refresh current tab data
   */
  refreshData(): void {
    switch (this.activeTab) {
      case 'questions':
        this.loadQuestionLeaderboard();
        break;
      case 'examPapers':
        this.loadExamPaperLeaderboard();
        break;
      case 'combined':
        this.loadCombinedLeaderboard();
        break;
      case 'stats':
        this.loadAdminStats();
        break;
    }
  }
}
