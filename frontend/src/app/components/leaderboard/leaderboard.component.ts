import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TestService, LeaderboardEntry } from '../../services/test.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.scss']
})
export class LeaderboardComponent implements OnInit {
  leaderboard: LeaderboardEntry[] = [];
  seriesId: string | null = null;
  isLoading = true;
  error: string | null = null;
  seriesTitle: string | null = null; // Optional: To display series title

  constructor(
    private route: ActivatedRoute,
    private testService: TestService
  ) { }

  ngOnInit(): void {
    this.seriesId = this.route.snapshot.paramMap.get('seriesId');
    // You could also fetch series details to get the title
    // For now, we'll just use the ID

    if (this.seriesId) {
      this.fetchLeaderboard(this.seriesId);
    } else {
      this.error = 'Series ID not found.';
      this.isLoading = false;
    }
  }

  fetchLeaderboard(seriesId: string): void {
    this.isLoading = true;
    this.testService.getLeaderboard(seriesId).subscribe({
      next: (data) => {
        this.leaderboard = data;
        this.isLoading = false;
        if (data.length === 0) {
          // You might want to check if the leaderboard is disabled or just empty
          // For now, just indicating it's empty or not available.
          this.error = 'Leaderboard is not available or no attempts have been made yet.';
        }
      },
      error: (err) => {
        console.error('Error fetching leaderboard:', err);
        this.error = 'Failed to load leaderboard. It might be disabled for this test series or an error occurred.';
        this.isLoading = false;
      }
    });
  }
}
