/**
 * @fileoverview Leaderboard Service
 * @description Angular service for handling leaderboard API communication
 * Provides methods to fetch question leaderboards, exam paper leaderboards,
 * combined metrics, and admin statistics
 * 
 * @author NexPrep Development Team
 * @since 1.0.0
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Interface for leaderboard entry containing admin info and metrics
 */
export interface LeaderboardEntry {
  rank: number;
  adminId: string;
  adminName: string;
  email: string;
  count: number;
  percentage?: number;
}

/**
 * Interface for combined leaderboard entry with both metrics
 */
export interface CombinedLeaderboardEntry {
  rank: number;
  adminId: string;
  adminName: string;
  email: string;
  questionsCount: number;
  examPapersCount: number;
  totalContributions: number;
  questionsPercentage?: number;
  examPapersPercentage?: number;
}

/**
 * Interface for leaderboard response
 */
export interface LeaderboardResponse {
  success: boolean;
  data: {
    period: string;
    totalCount: number;
    leaderboard: LeaderboardEntry[];
  };
  message?: string;
}

/**
 * Interface for combined leaderboard response
 */
export interface CombinedLeaderboardResponse {
  success: boolean;
  data: {
    period: string;
    totalQuestions: number;
    totalExamPapers: number;
    totalContributions: number;
    leaderboard: CombinedLeaderboardEntry[];
  };
  message?: string;
}

/**
 * Interface for admin statistics
 */
export interface AdminStats {
  adminId: string;
  adminName: string;
  email: string;
  periods: {
    today: { questions: number; examPapers: number; total: number };
    last7Days: { questions: number; examPapers: number; total: number };
    last30Days: { questions: number; examPapers: number; total: number };
    allTime: { questions: number; examPapers: number; total: number };
  };
}

/**
 * Interface for admin statistics response
 */
export interface AdminStatsResponse {
  success: boolean;
  data: {
    admins: AdminStats[];
    summary: {
      totalAdmins: number;
      totalQuestions: number;
      totalExamPapers: number;
      totalContributions: number;
    };
  };
  message?: string;
}

/**
 * Time period options for leaderboard filtering
 */
export type TimePeriod = 'today' | '7days' | '30days' | 'alltime';

@Injectable({
  providedIn: 'root'
})
export class LeaderboardService {
  private readonly apiUrl = `${environment.apiUrl}/leaderboard`;

  constructor(private http: HttpClient) {}

  /**
   * Get question addition leaderboard
   * @param period Time period filter
   * @returns Observable of leaderboard response
   */
  getQuestionLeaderboard(period: TimePeriod = 'alltime'): Observable<LeaderboardResponse> {
    const params = new HttpParams().set('period', period);
    return this.http.get<LeaderboardResponse>(`${this.apiUrl}/questions`, { params });
  }

  /**
   * Get exam paper creation leaderboard
   * @param period Time period filter
   * @returns Observable of leaderboard response
   */
  getExamPaperLeaderboard(period: TimePeriod = 'alltime'): Observable<LeaderboardResponse> {
    const params = new HttpParams().set('period', period);
    return this.http.get<LeaderboardResponse>(`${this.apiUrl}/exam-papers`, { params });
  }

  /**
   * Get combined leaderboard with both metrics
   * @param period Time period filter
   * @returns Observable of combined leaderboard response
   */
  getCombinedLeaderboard(period: TimePeriod = 'alltime'): Observable<CombinedLeaderboardResponse> {
    const params = new HttpParams().set('period', period);
    return this.http.get<CombinedLeaderboardResponse>(`${this.apiUrl}/combined`, { params });
  }

  /**
   * Get comprehensive admin statistics
   * @returns Observable of admin statistics response
   */
  getAdminStats(): Observable<AdminStatsResponse> {
    return this.http.get<AdminStatsResponse>(`${this.apiUrl}/stats`);
  }

  /**
   * Get formatted period display name
   * @param period Time period
   * @returns Formatted display name
   */
  getPeriodDisplayName(period: TimePeriod): string {
    const periodNames: Record<TimePeriod, string> = {
      'today': 'Today',
      '7days': 'Last 7 Days',
      '30days': 'Last 30 Days',
      'alltime': 'All Time'
    };
    return periodNames[period];
  }

  /**
   * Get all available time periods
   * @returns Array of time period options
   */
  getAvailablePeriods(): Array<{ value: TimePeriod; label: string }> {
    return [
      { value: 'today', label: 'Today' },
      { value: '7days', label: 'Last 7 Days' },
      { value: '30days', label: 'Last 30 Days' },
      { value: 'alltime', label: 'All Time' }
    ];
  }
}
