import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { RewardService, RewardSummary, Reward, RewardTransaction, LeaderboardEntry } from '../../services/reward.service';

@Component({
  selector: 'app-rewards-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rewards-dashboard">
      <!-- Header Section -->
      <div class="dashboard-header">
        <div class="header-content">
          <h1 class="dashboard-title">Rewards Dashboard</h1>
          <p class="dashboard-subtitle">Earn points through referrals and redeem amazing rewards!</p>
        </div>
        <div class="points-display">
          <div class="points-card">
            <div class="points-icon">🎯</div>
            <div class="points-info">
              <span class="points-label">Your Points</span>
              <span class="points-value">{{ rewardSummary?.currentPoints || 0 | number }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Overview -->
      <div class="stats-grid" *ngIf="rewardSummary">
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <h3>{{ rewardSummary.totalEarned | number }}</h3>
            <p>Total Earned</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🛍️</div>
          <div class="stat-content">
            <h3>{{ rewardSummary.totalSpent | number }}</h3>
            <p>Total Spent</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <h3>{{ rewardSummary.successfulReferrals }}</h3>
            <p>Successful Referrals</p>
          </div>
        </div>
        <div class="stat-card" *ngIf="rewardSummary.nextMilestone">
          <div class="stat-icon">🎯</div>
          <div class="stat-content">
            <h3>{{ rewardSummary.nextMilestone - rewardSummary.successfulReferrals }}</h3>
            <p>To Next Milestone</p>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tab-navigation">
        <button 
          *ngFor="let tab of tabs" 
          [class]="'tab-button ' + (activeTab === tab.id ? 'active' : '')"
          (click)="setActiveTab(tab.id)">
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Available Rewards Tab -->
        <div *ngIf="activeTab === 'rewards'" class="rewards-grid">
          <div class="loading-spinner" *ngIf="loading">
            <div class="spinner"></div>
            <p>Loading rewards...</p>
          </div>
          
          <div *ngIf="!loading && availableRewards.length === 0" class="empty-state">
            <div class="empty-icon">🎁</div>
            <h3>No Rewards Available</h3>
            <p>Keep earning points through referrals to unlock amazing rewards!</p>
          </div>

          <div 
            *ngFor="let reward of availableRewards" 
            class="reward-card"
            [class.insufficient-points]="(rewardSummary?.currentPoints || 0) < reward.pointsCost">
            <div class="reward-header">
              <h3>{{ reward.title }}</h3>
              <div class="reward-cost">
                <span class="points-cost">{{ reward.pointsCost }}</span>
                <span class="points-label">pts</span>
              </div>
            </div>
            <p class="reward-description">{{ reward.description }}</p>
            <div class="reward-details">
              <span class="reward-category">{{ getCategoryDisplayName(reward.category) }}</span>
              <span *ngIf="reward.isLimited" class="reward-stock">
                {{ reward.remainingQuantity }}/{{ reward.totalQuantity }} left
              </span>
            </div>
            <button 
              class="redeem-button"
              [disabled]="(rewardSummary?.currentPoints || 0) < reward.pointsCost || redeemingReward"
              (click)="redeemReward(reward)">
              <span *ngIf="!redeemingReward">
                {{ (rewardSummary?.currentPoints || 0) < reward.pointsCost ? 'Insufficient Points' : 'Redeem' }}
              </span>
              <span *ngIf="redeemingReward">Redeeming...</span>
            </button>
          </div>
        </div>

        <!-- Transaction History Tab -->
        <div *ngIf="activeTab === 'transactions'" class="transactions-section">
          <div class="loading-spinner" *ngIf="loading">
            <div class="spinner"></div>
            <p>Loading transactions...</p>
          </div>

          <div *ngIf="!loading && recentTransactions.length === 0" class="empty-state">
            <div class="empty-icon">📊</div>
            <h3>No Transactions Yet</h3>
            <p>Your reward transactions will appear here once you start earning points.</p>
          </div>

          <div class="transaction-list" *ngIf="!loading && recentTransactions.length > 0">
            <div 
              *ngFor="let transaction of recentTransactions" 
              class="transaction-item"
              [class]="transaction.amount > 0 ? 'credit' : 'debit'">
              <div class="transaction-icon">
                {{ transaction.amount > 0 ? '💰' : '🛍️' }}
              </div>
              <div class="transaction-details">
                <h4>{{ getTransactionTypeDisplayName(transaction.type) }}</h4>
                <p>{{ transaction.description }}</p>
                <span class="transaction-date">{{ transaction.createdAt | date:'medium' }}</span>
              </div>
              <div class="transaction-amount">
                <span [class]="transaction.amount > 0 ? 'positive' : 'negative'">
                  {{ transaction.amount > 0 ? '+' : '' }}{{ transaction.amount }}
                </span>
                <span class="balance">Balance: {{ transaction.balance }}</span>
              </div>
            </div>
          </div>

          <button 
            *ngIf="!loading && recentTransactions.length > 0"
            class="load-more-button"
            (click)="loadMoreTransactions()">
            View All Transactions
          </button>
        </div>

        <!-- Leaderboard Tab -->
        <div *ngIf="activeTab === 'leaderboard'" class="leaderboard-section">
          <div class="loading-spinner" *ngIf="loading">
            <div class="spinner"></div>
            <p>Loading leaderboard...</p>
          </div>

          <div class="leaderboard-list" *ngIf="!loading">
            <div class="leaderboard-header">
              <h3>🏆 Top Referrers</h3>
              <p>See how you rank among other users!</p>
            </div>

            <div 
              *ngFor="let entry of leaderboard; let i = index" 
              class="leaderboard-item"
              [class.current-user]="isCurrentUser(entry.email)">
              <div class="rank">
                <span class="rank-number">{{ entry.rank }}</span>
                <span *ngIf="entry.rank <= 3" class="rank-medal">
                  {{ entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉' }}
                </span>
              </div>
              <div class="user-info">
                <h4>{{ entry.name }}</h4>
                <span class="user-email">{{ entry.email.substring(0, 3) }}***</span>
              </div>
              <div class="user-stats">
                <div class="stat">
                  <span class="stat-value">{{ entry.successfulReferrals }}</span>
                  <span class="stat-label">Referrals</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ formatPoints(entry.totalPointsEarned) }}</span>
                  <span class="stat-label">Points</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- How to Earn Tab -->
        <div *ngIf="activeTab === 'earn'" class="earn-section">
          <div class="earn-methods">
            <h3>💡 How to Earn Points</h3>
            
            <div class="method-card">
              <div class="method-icon">👥</div>
              <div class="method-content">
                <h4>Refer Friends</h4>
                <p>Earn <strong>100 points</strong> for each successful referral</p>
                <p>Your friend gets <strong>50 points</strong> as a welcome bonus!</p>
              </div>
            </div>

            <div class="method-card">
              <div class="method-icon">🎯</div>
              <div class="method-content">
                <h4>Reach Milestones</h4>
                <p>Get bonus points for referral milestones:</p>
                <ul>
                  <li>5 referrals: <strong>200 bonus points</strong></li>
                  <li>10 referrals: <strong>500 bonus points</strong></li>
                  <li>25 referrals: <strong>1,000 bonus points</strong></li>
                </ul>
              </div>
            </div>

            <div class="method-card">
              <div class="method-icon">📱</div>
              <div class="method-content">
                <h4>Daily Activities</h4>
                <p>Earn points through regular app usage:</p>
                <ul>
                  <li>Daily login: <strong>5 points</strong></li>
                  <li>Complete a test: <strong>10 points</strong></li>
                </ul>
              </div>
            </div>
          </div>

          <div class="referral-cta">
            <h4>Start Referring Now!</h4>
            <p>Share your referral link and start earning points today.</p>
            <button class="cta-button" (click)="goToProfile()">
              Get Your Referral Link
            </button>
          </div>
        </div>
      </div>

      <!-- Success/Error Messages -->
      <div *ngIf="message" [class]="'message ' + messageType">
        {{ message }}
      </div>
    </div>
  `,
  styleUrls: ['./rewards-dashboard.component.scss']
})
export class RewardsDashboardComponent implements OnInit, OnDestroy {
  rewardSummary: RewardSummary | null = null;
  availableRewards: Reward[] = [];
  recentTransactions: RewardTransaction[] = [];
  leaderboard: LeaderboardEntry[] = [];
  
  activeTab = 'rewards';
  loading = false;
  redeemingReward = false;
  
  message = '';
  messageType: 'success' | 'error' = 'success';
  
  private subscriptions: Subscription[] = [];

  tabs = [
    { id: 'rewards', label: 'Available Rewards' },
    { id: 'transactions', label: 'Transaction History' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'earn', label: 'How to Earn' }
  ];

  constructor(
    private rewardService: RewardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.subscribeToRewardData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private subscribeToRewardData(): void {
    this.subscriptions.push(
      this.rewardService.rewardSummary$.subscribe(summary => {
        this.rewardSummary = summary;
        if (summary) {
          this.recentTransactions = summary.recentTransactions || [];
        }
      })
    );

    this.subscriptions.push(
      this.rewardService.availableRewards$.subscribe(rewards => {
        this.availableRewards = rewards;
      })
    );
  }

  private loadDashboardData(): void {
    this.loading = true;
    
    // Load reward summary
    this.rewardService.getUserRewardDashboard().subscribe({
      next: () => {
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading reward dashboard:', error);
        this.showMessage('Error loading dashboard data', 'error');
        this.loading = false;
      }
    });

    // Load available rewards
    this.rewardService.getAvailableRewards().subscribe({
      error: (error) => {
        console.error('Error loading available rewards:', error);
      }
    });

    // Load leaderboard
    this.loadLeaderboard();
  }

  private loadLeaderboard(): void {
    this.rewardService.getLeaderboard().subscribe({
      next: (response) => {
        if (response.success) {
          this.leaderboard = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading leaderboard:', error);
      }
    });
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
    
    // Load data specific to the tab if needed
    if (tabId === 'leaderboard' && this.leaderboard.length === 0) {
      this.loadLeaderboard();
    }
  }

  redeemReward(reward: Reward): void {
    if (this.redeemingReward) return;
    
    this.redeemingReward = true;
    
    this.rewardService.redeemReward(reward._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.showMessage(`Successfully redeemed ${reward.title}!`, 'success');
          // Refresh data
          this.loadDashboardData();
        }
        this.redeemingReward = false;
      },
      error: (error) => {
        console.error('Error redeeming reward:', error);
        this.showMessage(error.error?.message || 'Error redeeming reward', 'error');
        this.redeemingReward = false;
      }
    });
  }

  loadMoreTransactions(): void {
    this.router.navigate(['/rewards/transactions']);
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  getCategoryDisplayName(category: string): string {
    return this.rewardService.getCategoryDisplayName(category);
  }

  getTransactionTypeDisplayName(type: string): string {
    return this.rewardService.getTransactionTypeDisplayName(type);
  }

  formatPoints(points: number): string {
    return this.rewardService.formatPoints(points);
  }

  isCurrentUser(email: string): boolean {
    // This would need to be implemented based on your auth service
    // For now, return false
    return false;
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
    
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }
}
