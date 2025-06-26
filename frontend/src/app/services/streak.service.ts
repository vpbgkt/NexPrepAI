import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface StreakStats {
  // Login streaks
  currentLoginStreak: number;
  longestLoginStreak: number;
  totalLoginDays: number;
  lastLoginDate: string | null;
  loginStreakActive: boolean;
  canEarnLoginBonus: boolean;
  
  // Study streaks
  currentStudyStreak: number;
  longestStudyStreak: number;
  totalStudyDays: number;
  lastStudyDate: string | null;
  studyStreakActive: boolean;
  canEarnStudyBonus: boolean;
  
  // Weekly streaks
  weeklyStreak: number;
  lastWeeklyStreakDate: string | null;

  // Legacy fields for backward compatibility
  lastActivityDate: string | null;
}

export interface StreakLeaderboardEntry {
  rank: number;
  name: string;
  email: string;
  currentLoginStreak: number;
  longestLoginStreak: number;
  currentStudyStreak: number;
  longestStudyStreak: number;
  weeklyStreak: number;
  totalLoginDays: number;
  totalStudyDays: number;
  lastLoginDate: string | null;
  lastStudyDate: string | null;
  lastActivityDate: string | null;
  isLoginActive: boolean;
  isStudyActive: boolean;
}

export interface StreakMilestone {
  days: number;
  title: string;
  reward: number;
  description: string;
}

export interface StreakMilestones {
  loginMilestones: StreakMilestone[];
  studyMilestones: StreakMilestone[];
  streakRewards: {
    dailyLogin: number;
    dailyStudy: number;
    weeklyLoginBonus: number;
    weeklyStudyBonus: number;
    monthlyLoginBonus: number;
    monthlyStudyBonus: number;
  };
  description: {
    login: string;
    study: string;
    combined: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class StreakService {
  private apiUrl = '/api/streak';

  constructor(private http: HttpClient) { }

  /**
   * Get user's streak statistics
   */
  getStreakStats(): Observable<{ success: boolean; data: StreakStats }> {
    return this.http.get<{ success: boolean; data: StreakStats }>(`${this.apiUrl}/stats`);
  }

  /**
   * Manually trigger daily login reward (for testing)
   */
  triggerDailyLogin(): Observable<any> {
    return this.http.post(`${this.apiUrl}/daily-login`, {});
  }

  /**
   * Manually trigger study activity (for testing)
   */
  triggerStudyActivity(): Observable<any> {
    return this.http.post(`${this.apiUrl}/study-activity`, {});
  }

  /**
   * Get streak leaderboard
   */
  getStreakLeaderboard(type: string = 'study', limit: number = 10): Observable<{ success: boolean; data: { type: string; leaderboard: StreakLeaderboardEntry[] } }> {
    return this.http.get<{ success: boolean; data: { type: string; leaderboard: StreakLeaderboardEntry[] } }>(`${this.apiUrl}/leaderboard?type=${type}&limit=${limit}`);
  }

  /**
   * Get streak milestones
   */
  getStreakMilestones(): Observable<{ success: boolean; data: StreakMilestones }> {
    return this.http.get<{ success: boolean; data: StreakMilestones }>(`${this.apiUrl}/milestones`);
  }

  /**
   * Reset user's streak (admin only)
   */
  resetUserStreak(userId: string, streakType: string = 'all'): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset/${userId}`, { streakType });
  }

  /**
   * Format streak display text
   */
  formatStreakText(streak: number, type: 'login' | 'study'): string {
    if (streak === 0) return `No ${type} streak`;
    if (streak === 1) return `1 day ${type} streak`;
    return `${streak} days ${type} streak`;
  }

  /**
   * Get streak status color
   */
  getStreakStatusColor(streak: number): string {
    if (streak === 0) return 'text-gray-500';
    if (streak < 7) return 'text-blue-600';
    if (streak < 30) return 'text-green-600';
    if (streak < 100) return 'text-orange-600';
    return 'text-purple-600';
  }

  /**
   * Get streak status icon
   */
  getStreakStatusIcon(streak: number): string {
    if (streak === 0) return '⚪';
    if (streak < 7) return '🔥';
    if (streak < 30) return '💪';
    if (streak < 100) return '🚀';
    return '👑';
  }

  /**
   * Calculate days until next milestone
   */
  getDaysUntilNextMilestone(currentStreak: number, milestones: StreakMilestone[]): { days: number; milestone: StreakMilestone | null } {
    const nextMilestone = milestones.find(m => m.days > currentStreak);
    if (!nextMilestone) {
      return { days: 0, milestone: null };
    }
    return { days: nextMilestone.days - currentStreak, milestone: nextMilestone };
  }
}
