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
    <div class="min-h-screen bg-gray-50 p-4 md:p-6">
      <!-- Header Section -->
      <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div class="mb-4 lg:mb-0">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">Rewards Dashboard</h1>
            <p class="text-gray-600">Earn points through referrals and redeem amazing rewards!</p>
          </div>
          <div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white min-w-max">
            <div class="flex items-center space-x-4">
              <div class="text-3xl">🎯</div>
              <div>
                <div class="text-sm opacity-90">Your Points</div>
                <div class="text-2xl font-bold">{{ rewardSummary?.currentPoints || 0 | number }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Overview -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" *ngIf="rewardSummary">
        <div class="bg-white rounded-lg shadow-sm p-6">
          <div class="flex items-center space-x-3">
            <div class="text-2xl">💰</div>
            <div>
              <div class="text-2xl font-bold text-gray-900">{{ rewardSummary.totalEarned | number }}</div>
              <div class="text-sm text-gray-600">Total Earned</div>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-6">
          <div class="flex items-center space-x-3">
            <div class="text-2xl">🛍️</div>
            <div>
              <div class="text-2xl font-bold text-gray-900">{{ rewardSummary.totalSpent | number }}</div>
              <div class="text-sm text-gray-600">Total Spent</div>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-6">
          <div class="flex items-center space-x-3">
            <div class="text-2xl">👥</div>
            <div>
              <div class="text-2xl font-bold text-gray-900">{{ rewardSummary.successfulReferrals }}</div>
              <div class="text-sm text-gray-600">Successful Referrals</div>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-6" *ngIf="rewardSummary.nextMilestone">
          <div class="flex items-center space-x-3">
            <div class="text-2xl">🎯</div>
            <div>
              <div class="text-2xl font-bold text-gray-900">{{ rewardSummary.nextMilestone - rewardSummary.successfulReferrals }}</div>
              <div class="text-sm text-gray-600">To Next Milestone</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="bg-white rounded-lg shadow-sm mb-6">
        <div class="border-b border-gray-200">
          <nav class="flex space-x-8 px-6" aria-label="Tabs">
            <button 
              *ngFor="let tab of tabs" 
              [class]="'py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ' + 
                       (activeTab === tab.id ? 
                        'border-blue-500 text-blue-600' : 
                        'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')"
              (click)="setActiveTab(tab.id)">
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
          <!-- Available Rewards Tab -->
          <div *ngIf="activeTab === 'rewards'">
            <div class="flex items-center justify-center py-12" *ngIf="loading">
              <div class="text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p class="text-gray-600">Loading rewards...</p>
              </div>
            </div>
            
            <div *ngIf="!loading && availableRewards.length === 0" class="text-center py-12">
              <div class="text-6xl mb-4">🎁</div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">No Rewards Available</h3>
              <p class="text-gray-600">Keep earning points through referrals to unlock amazing rewards!</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" *ngIf="!loading && availableRewards.length > 0">
              <div 
                *ngFor="let reward of availableRewards" 
                [class]="'bg-white border rounded-lg shadow-sm p-6 transition-all duration-200 hover:shadow-md ' + 
                         ((rewardSummary?.currentPoints || 0) < reward.pointsCost ? 'opacity-60' : 'hover:border-blue-200')">
                <div class="flex justify-between items-start mb-4">
                  <h3 class="text-lg font-semibold text-gray-900">{{ reward.title }}</h3>
                  <div class="text-right">
                    <span class="text-2xl font-bold text-blue-600">{{ reward.pointsCost }}</span>
                    <span class="text-sm text-gray-500 ml-1">pts</span>
                  </div>
                </div>
                <p class="text-gray-600 mb-4">{{ reward.description }}</p>
                <div class="flex justify-between items-center mb-4">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {{ getCategoryDisplayName(reward.category) }}
                  </span>
                  <span *ngIf="reward.isLimited" class="text-sm text-gray-500">
                    {{ reward.remainingQuantity }}/{{ reward.totalQuantity }} left
                  </span>
                </div>
                <button 
                  [class]="'w-full py-2 px-4 rounded-md font-medium transition-colors duration-200 ' + 
                           ((rewardSummary?.currentPoints || 0) < reward.pointsCost || redeemingReward ? 
                            'bg-gray-300 text-gray-500 cursor-not-allowed' : 
                            'bg-blue-600 text-white hover:bg-blue-700')"
                  [disabled]="(rewardSummary?.currentPoints || 0) < reward.pointsCost || redeemingReward"
                  (click)="redeemReward(reward)">
                  <span *ngIf="!redeemingReward">
                    {{ (rewardSummary?.currentPoints || 0) < reward.pointsCost ? 'Insufficient Points' : 'Redeem' }}
                  </span>
                  <span *ngIf="redeemingReward">Redeeming...</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Transaction History Tab -->
          <div *ngIf="activeTab === 'transactions'">
            <div class="flex items-center justify-center py-12" *ngIf="loading">
              <div class="text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p class="text-gray-600">Loading transactions...</p>
              </div>
            </div>

            <div *ngIf="!loading && recentTransactions.length === 0" class="text-center py-12">
              <div class="text-6xl mb-4">📊</div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">No Transactions Yet</h3>
              <p class="text-gray-600">Your reward transactions will appear here once you start earning points.</p>
            </div>

            <div class="space-y-4" *ngIf="!loading && recentTransactions.length > 0">
              <div 
                *ngFor="let transaction of recentTransactions" 
                class="bg-white border rounded-lg p-4 flex items-center space-x-4">
                <div class="text-2xl">
                  {{ transaction.amount > 0 ? '💰' : '🛍️' }}
                </div>
                <div class="flex-1">
                  <h4 class="font-semibold text-gray-900">{{ getTransactionTypeDisplayName(transaction.type) }}</h4>
                  <p class="text-gray-600 text-sm">{{ transaction.description }}</p>
                  <span class="text-xs text-gray-500">{{ transaction.createdAt | date:'medium' }}</span>
                </div>
                <div class="text-right">
                  <span [class]="'text-lg font-semibold ' + (transaction.amount > 0 ? 'text-green-600' : 'text-red-600')">
                    {{ transaction.amount > 0 ? '+' : '' }}{{ transaction.amount }}
                  </span>
                  <div class="text-sm text-gray-500">Balance: {{ transaction.balance }}</div>
                </div>
              </div>
            </div>

            <button 
              *ngIf="!loading && recentTransactions.length > 0"
              class="mt-6 w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors duration-200"
              (click)="loadMoreTransactions()">
              View All Transactions
            </button>
          </div>

          <!-- Leaderboard Tab -->
          <div *ngIf="activeTab === 'leaderboard'">
            <div class="flex items-center justify-center py-12" *ngIf="loading">
              <div class="text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p class="text-gray-600">Loading leaderboard...</p>
              </div>
            </div>

            <div *ngIf="!loading">
              <div class="text-center mb-6">
                <h3 class="text-xl font-semibold text-gray-900 mb-2">🏆 Top Referrers</h3>
                <p class="text-gray-600">See how you rank among other users!</p>
              </div>

              <div class="space-y-3">
                <div 
                  *ngFor="let entry of leaderboard; let i = index" 
                  [class]="'bg-white border rounded-lg p-4 flex items-center space-x-4 ' + 
                           (isCurrentUser(entry.email) ? 'border-blue-200 bg-blue-50' : '')">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg font-bold text-gray-900">{{ entry.rank }}</span>
                    <span *ngIf="entry.rank <= 3" class="text-xl">
                      {{ entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉' }}
                    </span>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-semibold text-gray-900">{{ entry.name }}</h4>
                    <span class="text-sm text-gray-500">{{ entry.email.substring(0, 3) }}***</span>
                  </div>
                  <div class="text-right">
                    <div class="text-lg font-semibold text-gray-900">{{ entry.successfulReferrals }}</div>
                    <div class="text-sm text-gray-500">Referrals</div>
                  </div>
                  <div class="text-right">
                    <div class="text-lg font-semibold text-blue-600">{{ formatPoints(entry.totalPointsEarned) }}</div>
                    <div class="text-sm text-gray-500">Points</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- How to Earn Tab -->
          <div *ngIf="activeTab === 'earn'">
            <div class="mb-8">
              <h3 class="text-xl font-semibold text-gray-900 mb-6">💡 How to Earn Points</h3>
              
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div class="bg-white border rounded-lg p-6">
                  <div class="text-3xl mb-4">👥</div>
                  <h4 class="text-lg font-semibold text-gray-900 mb-2">Refer Friends</h4>
                  <p class="text-gray-600 mb-2">Earn <strong class="text-blue-600">100 points</strong> for each successful referral</p>
                  <p class="text-gray-600">Your friend gets <strong class="text-green-600">50 points</strong> as a welcome bonus!</p>
                </div>

                <div class="bg-white border rounded-lg p-6">
                  <div class="text-3xl mb-4">🎯</div>
                  <h4 class="text-lg font-semibold text-gray-900 mb-2">Reach Milestones</h4>
                  <p class="text-gray-600 mb-2">Get bonus points for referral milestones:</p>
                  <ul class="text-sm text-gray-600 space-y-1">
                    <li>5 referrals: <strong class="text-blue-600">200 bonus points</strong></li>
                    <li>10 referrals: <strong class="text-blue-600">500 bonus points</strong></li>
                    <li>25 referrals: <strong class="text-blue-600">1,000 bonus points</strong></li>
                  </ul>
                </div>

                <div class="bg-white border rounded-lg p-6">
                  <div class="text-3xl mb-4">📱</div>
                  <h4 class="text-lg font-semibold text-gray-900 mb-2">Daily Activities</h4>
                  <p class="text-gray-600 mb-2">Earn points through regular app usage:</p>
                  <ul class="text-sm text-gray-600 space-y-1">
                    <li>Daily login: <strong class="text-blue-600">5 points</strong></li>
                    <li>Complete a test: <strong class="text-blue-600">10 points</strong></li>
                  </ul>
                </div>
              </div>

              <div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white text-center">
                <h4 class="text-xl font-semibold mb-2">Start Referring Now!</h4>
                <p class="mb-4">Share your referral link and start earning points today.</p>
                <button class="bg-white text-blue-600 px-6 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors duration-200" (click)="goToProfile()">
                  Get Your Referral Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Success/Error Messages -->
      <div *ngIf="message" [class]="'fixed bottom-4 right-4 p-4 rounded-md shadow-lg z-50 ' + (messageType === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white')">
        {{ message }}
      </div>
    </div>
  `,
  styleUrls: []
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
