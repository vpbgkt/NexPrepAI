import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface RewardSummary {
  currentPoints: number;
  totalEarned: number;
  totalSpent: number;
  successfulReferrals: number;
  nextMilestone?: number;
  recentTransactions: RewardTransaction[];
  redemptions: RewardRedemption[];
}

export interface RewardTransaction {
  _id: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  metadata: any;
  status: string;
  processedAt: Date;
  createdAt: Date;
}

export interface Reward {
  _id: string;
  title: string;
  description: string;
  pointsCost: number;
  category: string;
  type: string;
  value: any;
  isActive: boolean;
  isLimited: boolean;
  totalQuantity?: number;
  remainingQuantity?: number;
  minimumLevel: number;
  displayOrder: number;
  imageUrl?: string;
  termsAndConditions?: string;
  validFrom: Date;
  validUntil?: Date;
  isAvailable?: boolean;
}

export interface RewardRedemption {
  _id: string;
  reward: Partial<Reward>;
  pointsSpent: number;
  status: string;
  deliveryMethod: string;
  deliveryDetails: any;
  redemptionCode?: string;
  expiresAt: Date;
  usageCount: number;
  maxUsageCount: number;
  isUsable?: boolean;
  createdAt: Date;
  completedAt?: Date;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  email: string;
  successfulReferrals: number;
  rewardPoints: number;
  totalPointsEarned: number;
}

export interface AdminAnalytics {
  userStats: {
    totalUsers: number;
    usersWithReferrals: number;
    totalReferrals: number;
  };
  pointsStats: {
    totalPointsEarned: number;
    totalPointsSpent: number;
    totalPointsInCirculation: number;
  };
  recentTransactions: RewardTransaction[];
  topRewards: any[];
}

@Injectable({
  providedIn: 'root'
})
export class RewardService {
  private apiUrl = `${environment.apiUrl}/rewards`;
  
  // BehaviorSubjects to manage state
  private rewardSummarySubject = new BehaviorSubject<RewardSummary | null>(null);
  public rewardSummary$ = this.rewardSummarySubject.asObservable();
  
  private availableRewardsSubject = new BehaviorSubject<Reward[]>([]);
  public availableRewards$ = this.availableRewardsSubject.asObservable();
  
  private userPointsSubject = new BehaviorSubject<number>(0);
  public userPoints$ = this.userPointsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Get user's reward dashboard
  getUserRewardDashboard(): Observable<{ success: boolean; data: RewardSummary }> {
    return this.http.get<{ success: boolean; data: RewardSummary }>(`${this.apiUrl}/dashboard`)
      .pipe(
        tap(response => {
          if (response.success) {
            this.rewardSummarySubject.next(response.data);
            this.userPointsSubject.next(response.data.currentPoints);
          }
        })
      );
  }

  // Get available rewards for user
  getAvailableRewards(): Observable<{ success: boolean; data: { userPoints: number; rewards: Reward[] } }> {
    return this.http.get<{ success: boolean; data: { userPoints: number; rewards: Reward[] } }>(`${this.apiUrl}/available`)
      .pipe(
        tap(response => {
          if (response.success) {
            this.availableRewardsSubject.next(response.data.rewards);
            this.userPointsSubject.next(response.data.userPoints);
          }
        })
      );
  }

  // Get all rewards (catalog)
  getAllRewards(params?: { category?: string; isActive?: boolean; page?: number; limit?: number }): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key as keyof typeof params] !== undefined) {
          httpParams = httpParams.set(key, params[key as keyof typeof params]!.toString());
        }
      });
    }
    return this.http.get(`${this.apiUrl}/catalog`, { params: httpParams });
  }

  // Redeem a reward
  redeemReward(rewardId: string): Observable<{ success: boolean; message: string; data: RewardRedemption }> {
    return this.http.post<{ success: boolean; message: string; data: RewardRedemption }>(`${this.apiUrl}/redeem`, { rewardId })
      .pipe(
        tap(() => {
          // Refresh data after successful redemption
          this.getUserRewardDashboard().subscribe();
          this.getAvailableRewards().subscribe();
        })
      );
  }

  // Get user's redemption history
  getRedemptionHistory(page: number = 1, limit: number = 10): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get(`${this.apiUrl}/redemptions`, { params });
  }

  // Get user's transaction history
  getTransactionHistory(page: number = 1, limit: number = 20, type?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    if (type) {
      params = params.set('type', type);
    }
    return this.http.get(`${this.apiUrl}/transactions`, { params });
  }

  // Get referral leaderboard
  getLeaderboard(limit: number = 50): Observable<{ success: boolean; data: LeaderboardEntry[] }> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<{ success: boolean; data: LeaderboardEntry[] }>(`${this.apiUrl}/leaderboard`, { params });
  }

  // Admin Methods
  
  // Get admin analytics
  getAdminAnalytics(): Observable<{ success: boolean; data: AdminAnalytics }> {
    return this.http.get<{ success: boolean; data: AdminAnalytics }>(`${this.apiUrl}/admin/analytics`);
  }

  // Create reward (admin)
  createReward(rewardData: Partial<Reward>): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/rewards`, rewardData);
  }

  // Update reward (admin)
  updateReward(rewardId: string, rewardData: Partial<Reward>): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/rewards/${rewardId}`, rewardData);
  }

  // Delete reward (admin)
  deleteReward(rewardId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/rewards/${rewardId}`);
  }

  // Get all redemptions (admin)
  getAllRedemptions(params?: { status?: string; page?: number; limit?: number }): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key as keyof typeof params] !== undefined) {
          httpParams = httpParams.set(key, params[key as keyof typeof params]!.toString());
        }
      });
    }
    return this.http.get(`${this.apiUrl}/admin/redemptions`, { params: httpParams });
  }

  // Update redemption status (admin)
  updateRedemptionStatus(redemptionId: string, data: { status: string; adminNotes?: string; deliveryDetails?: any }): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/redemptions/${redemptionId}`, data);
  }

  // Adjust user points (admin)
  adjustUserPoints(data: { userId: string; amount: number; description: string; type?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/adjust-points`, data);
  }

  // Utility methods

  // Get current user points from cache
  getCurrentPoints(): number {
    return this.userPointsSubject.value;
  }

  // Get current reward summary from cache
  getCurrentRewardSummary(): RewardSummary | null {
    return this.rewardSummarySubject.value;
  }

  // Refresh all reward data
  refreshRewardData(): void {
    this.getUserRewardDashboard().subscribe();
    this.getAvailableRewards().subscribe();
  }

  // Format points for display
  formatPoints(points: number): string {
    if (points >= 1000000) {
      return (points / 1000000).toFixed(1) + 'M';
    } else if (points >= 1000) {
      return (points / 1000).toFixed(1) + 'K';
    }
    return points.toString();
  }

  // Get category display name
  getCategoryDisplayName(category: string): string {
    const categoryMap: { [key: string]: string } = {
      'TEST_ACCESS': 'Test Access',
      'DISCOUNT': 'Discounts',
      'MERCHANDISE': 'Merchandise',
      'DIGITAL_CONTENT': 'Digital Content',
      'PREMIUM_FEATURES': 'Premium Features',
      'GIFT_CARDS': 'Gift Cards',
      'CONSULTATION': 'Consultation',
      'OTHER': 'Other'
    };
    return categoryMap[category] || category;
  }

  // Get transaction type display name
  getTransactionTypeDisplayName(type: string): string {
    const typeMap: { [key: string]: string } = {
      'REFERRAL_BONUS': 'Referral Bonus',
      'SIGNUP_BONUS': 'Signup Bonus',
      'MILESTONE_BONUS': 'Milestone Bonus',
      'DAILY_LOGIN': 'Daily Login',
      'TEST_COMPLETION': 'Test Completion',
      'REWARD_REDEMPTION': 'Reward Redemption',
      'ADMIN_ADJUSTMENT': 'Admin Adjustment',
      'PENALTY': 'Penalty',
      'BONUS': 'Bonus',
      'REFUND': 'Refund'
    };
    return typeMap[type] || type;
  }

  // Get status color class
  getStatusColorClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'processing':
        return 'text-blue-600';
      case 'failed':
      case 'cancelled':
        return 'text-red-600';
      case 'expired':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  }
}
