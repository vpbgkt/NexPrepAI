import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RewardService } from '../../services/reward.service';
import { Subscription } from 'rxjs';

interface Reward {
  _id: string;
  title: string;
  description: string;
  pointsRequired: number;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Redemption {
  _id: string;
  userId: {
    _id: string;
    username: string;
    email: string;
  };
  rewardId: {
    _id: string;
    title: string;
    pointsRequired: number;
  };
  status: 'pending' | 'approved' | 'rejected';
  redemptionDate: string;
  approvalDate?: string;
}

interface AnalyticsData {
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
  recentTransactions: any[];
  topRewards: any[];
}

@Component({
    selector: 'app-admin-rewards',
    imports: [CommonModule, FormsModule],
    templateUrl: './admin-rewards.component.html',
    styleUrls: []
})
export class AdminRewardsComponent implements OnInit, OnDestroy {
  activeTab = 'overview';
  rewards: Reward[] = [];
  redemptions: Redemption[] = [];
  analytics: AnalyticsData | null = null;
  loading = false;
  error: string | null = null;

  // Modal states
  showCreateRewardModal = false;
  showEditRewardModal = false;
  showPointsModal = false;
  currentReward: Reward | null = null;
  // Form data
  newReward: Partial<Reward> = this.getEmptyReward();
  pointsAdjustment = {
    userId: '',
    username: '',
    amount: 0,
    description: ''
  };

  private subscriptions: Subscription[] = [];

  constructor(private rewardService: RewardService) {}

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadData() {
    this.loading = true;
    this.error = null;

    const rewardsSub = this.rewardService.getAllRewards().subscribe({
      next: (rewards) => {
        this.rewards = rewards;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading rewards:', error);
        this.error = 'Failed to load rewards';
        this.loading = false;
      }
    });

    const redemptionsSub = this.rewardService.getAllRedemptions().subscribe({
      next: (redemptions) => {
        this.redemptions = redemptions;
      },
      error: (error) => {
        console.error('Error loading redemptions:', error);
      }
    });    const analyticsSub = this.rewardService.getAdminAnalytics().subscribe({
      next: (response: any) => {
        this.analytics = response.data;
      },
      error: (error: any) => {
        console.error('Error loading analytics:', error);
      }
    });

    this.subscriptions.push(rewardsSub, redemptionsSub, analyticsSub);
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  openCreateRewardModal() {
    this.newReward = this.getEmptyReward();
    this.showCreateRewardModal = true;
  }

  openEditRewardModal(reward: Reward) {
    this.currentReward = reward;
    this.newReward = { ...reward };
    this.showEditRewardModal = true;
  }
  closeModals() {
    this.showCreateRewardModal = false;
    this.showEditRewardModal = false;
    this.showPointsModal = false;
    this.currentReward = null;
    this.newReward = this.getEmptyReward();
    this.pointsAdjustment = {
      userId: '',
      username: '',
      amount: 0,
      description: ''
    };
  }

  createReward() {
    if (!this.newReward.title || !this.newReward.pointsRequired) {
      return;
    }

    const rewardData = {
      title: this.newReward.title,
      description: this.newReward.description || '',
      pointsRequired: this.newReward.pointsRequired,
      category: this.newReward.category || 'general',
      isActive: this.newReward.isActive !== false
    };

    this.rewardService.createReward(rewardData).subscribe({
      next: (reward) => {
        this.rewards.push(reward);
        this.closeModals();
      },
      error: (error) => {
        console.error('Error creating reward:', error);
        this.error = 'Failed to create reward';
      }
    });
  }

  updateReward() {
    if (!this.currentReward || !this.newReward.title || !this.newReward.pointsRequired) {
      return;
    }

    const rewardData = {
      title: this.newReward.title,
      description: this.newReward.description || '',
      pointsRequired: this.newReward.pointsRequired,
      category: this.newReward.category || 'general',
      isActive: this.newReward.isActive !== false
    };

    this.rewardService.updateReward(this.currentReward._id, rewardData).subscribe({
      next: (updatedReward) => {
        const index = this.rewards.findIndex(r => r._id === this.currentReward!._id);
        if (index !== -1) {
          this.rewards[index] = updatedReward;
        }
        this.closeModals();
      },
      error: (error) => {
        console.error('Error updating reward:', error);
        this.error = 'Failed to update reward';
      }
    });
  }

  deleteReward(rewardId: string) {
    if (confirm('Are you sure you want to delete this reward?')) {
      this.rewardService.deleteReward(rewardId).subscribe({
        next: () => {
          this.rewards = this.rewards.filter(r => r._id !== rewardId);
        },
        error: (error) => {
          console.error('Error deleting reward:', error);
          this.error = 'Failed to delete reward';
        }
      });
    }
  }

  updateRedemptionStatus(redemption: Redemption, status: 'approved' | 'rejected') {
    this.rewardService.updateRedemptionStatus(redemption._id, { status }).subscribe({
      next: (updatedRedemption) => {
        const index = this.redemptions.findIndex(r => r._id === redemption._id);
        if (index !== -1) {
          this.redemptions[index] = updatedRedemption;
        }
      },
      error: (error) => {
        console.error('Error updating redemption status:', error);
        this.error = 'Failed to update redemption status';
      }
    });
  }

  openPointsModal() {
    this.showPointsModal = true;
  }  adjustUserPoints() {
    if (!this.pointsAdjustment.userId || this.pointsAdjustment.amount === 0) {
      return;
    }

    const adjustmentData = {
      userId: this.pointsAdjustment.userId,
      amount: this.pointsAdjustment.amount,
      description: this.pointsAdjustment.description || 'Admin adjustment',
      type: 'ADMIN_ADJUSTMENT'
    };

    this.rewardService.adjustUserPoints(adjustmentData).subscribe({
      next: () => {
        this.closeModals();
        // Optionally reload analytics to reflect changes
        this.loadData();
      },
      error: (error: any) => {
        console.error('Error adjusting user points:', error);
        this.error = 'Failed to adjust user points';
      }
    });
  }

  getEmptyReward(): Partial<Reward> {
    return {
      title: '',
      description: '',
      pointsRequired: 0,
      category: 'general',
      isActive: true
    };
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'pending': return 'status-pending';
      default: return '';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  // Helper methods for template
  getActiveRewardsCount(): number {
    return this.rewards.filter(reward => reward.isActive).length;
  }

  getPendingRedemptionsCount(): number {
    return this.redemptions.filter(redemption => redemption.status === 'pending').length;
  }

  getRecentRedemptions(): Redemption[] {
    // Return the most recent redemptions (last 10, sorted by date)
    return this.redemptions
      .sort((a, b) => new Date(b.redemptionDate).getTime() - new Date(a.redemptionDate).getTime())
      .slice(0, 10);
  }
}
