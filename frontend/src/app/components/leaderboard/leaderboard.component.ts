import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TestService, LeaderboardEntry } from '../../services/test.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-leaderboard',
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './leaderboard.component.html',
    styleUrls: []
})
export class LeaderboardComponent implements OnInit {
  leaderboard: LeaderboardEntry[] = [];
  seriesId: string | null = null;
  isLoading = true;
  isRefreshing = false;
  error: string | null = null;
  seriesTitle: string | null = null; // Optional: To display series title
  Math = Math; // Making Math available in the template
  
  // Pagination properties
  currentPage = 1;
  pageSize = 10;
  displayedLeaderboard: LeaderboardEntry[] = [];
  
  // Filter options
  timeFilterOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' }
  ];
  selectedTimeFilter = 'all';
  filteredLeaderboard: LeaderboardEntry[] = [];
  
  // Display options
  pageSizeOptions = [5, 10, 25, 50];
  selectedPageSize = 10;
  
  // Sorting
  sortColumn: 'rank' | 'score' | 'percentage' | 'timeTakenSeconds' | 'submittedAt' = 'rank';
  sortDirection: 'asc' | 'desc' = 'asc';
  constructor(
    private route: ActivatedRoute,
    private testService: TestService,
    private router: Router
  ) { }
  ngOnInit(): void {
    this.seriesId = this.route.snapshot.paramMap.get('seriesId');
    this.pageSize = this.selectedPageSize;
    
    // Set initial sort to percentage (high to low) as that's most relevant for a leaderboard
    this.sortColumn = 'percentage';
    this.sortDirection = 'desc';
    
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
        this.leaderboard = data.leaderboard || [];
        this.seriesTitle = data.title; // Set the series title from the response
        this.isLoading = false;
        
        if (this.leaderboard.length === 0) {
          // Check for message in response if available
          this.error = data.message || 'Leaderboard is not available or no attempts have been made yet.';
        } else {
          console.log('Leaderboard data received by frontend:', JSON.stringify(this.leaderboard, null, 2));
          this.filterLeaderboard(); // Apply initial filter
        }
      },
      error: (err) => {
        console.error('Error fetching leaderboard:', err);
        this.error = 'Failed to load leaderboard. It might be disabled for this test series or an error occurred.';
        this.isLoading = false;
      }
    });
  }
  
  /**
   * Filters the leaderboard based on time filter
   */
  filterLeaderboard(): void {
    const now = new Date();
    
    if (this.selectedTimeFilter === 'all') {
      this.filteredLeaderboard = [...this.leaderboard];
    } else {
      // Calculate filter date based on selection
      let filterDate = new Date();
      
      if (this.selectedTimeFilter === 'week') {
        filterDate.setDate(filterDate.getDate() - 7);
      } else if (this.selectedTimeFilter === 'month') {
        filterDate.setMonth(filterDate.getMonth() - 1);
      } else if (this.selectedTimeFilter === 'year') {
        filterDate.setFullYear(filterDate.getFullYear() - 1);
      }
      
      // Filter entries after the filter date
      this.filteredLeaderboard = this.leaderboard.filter(entry => {
        const submittedDate = new Date(entry.submittedAt);
        return submittedDate >= filterDate;
      });
    }
    
    // Apply sorting
    this.sortLeaderboard();
    this.updatePage(1); // Reset to first page after filtering
  }
  
  /**
   * Sort the leaderboard by the specified column and direction
   */
  sortLeaderboard(): void {
    this.filteredLeaderboard.sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortColumn) {
        case 'rank':
          comparison = (a.rank || 0) - (b.rank || 0);
          break;
        case 'score':
          comparison = a.score - b.score;
          break;
        case 'percentage':
          comparison = a.percentage - b.percentage;
          break;
        case 'timeTakenSeconds':
          // For time taken, lower is better so default sort is opposite
          const aTime = a.timeTakenSeconds || Number.MAX_SAFE_INTEGER;
          const bTime = b.timeTakenSeconds || Number.MAX_SAFE_INTEGER;
          comparison = aTime - bTime;
          break;
        case 'submittedAt':
          comparison = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
          break;
        default:
          comparison = 0;
      }
      
      // If sort direction is descending, reverse the comparison
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }
  
  /**
   * Change the sort column and direction
   */
  onSortColumn(column: 'rank' | 'score' | 'percentage' | 'timeTakenSeconds' | 'submittedAt'): void {
    if (this.sortColumn === column) {
      // Toggle sort direction if the same column is clicked
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set default sort direction based on column
      this.sortColumn = column;
      if (column === 'rank' || column === 'timeTakenSeconds') {
        // Lower is better for rank and time taken
        this.sortDirection = 'asc';
      } else {
        // Higher is better for score and percentage
        this.sortDirection = 'desc';
      }
    }
    
    this.sortLeaderboard();
    this.updatePage(1); // Reset to first page after sorting
  }
  
  /**
   * Handle time filter change
   */
  onTimeFilterChange(): void {
    this.filterLeaderboard();
  }
  
  /**
   * Handle page size change
   */
  onPageSizeChange(): void {
    this.pageSize = this.selectedPageSize;
    this.updatePage(1); // Reset to first page
  }
  
  /**
   * Refresh the leaderboard data
   */
  refreshLeaderboard(): void {
    if (this.seriesId && !this.isRefreshing) {
      this.isRefreshing = true;
      this.testService.getLeaderboard(this.seriesId).subscribe({
        next: (data) => {
          this.leaderboard = data.leaderboard || [];
          this.filterLeaderboard();
          this.isRefreshing = false;
        },
        error: (err) => {
          console.error('Error refreshing leaderboard:', err);
          this.isRefreshing = false;
        }
      });
    }
  }
    /**
   * Updates the displayed leaderboard entries based on the current page
   */
  updatePage(page: number): void {
    this.currentPage = page;
    const startIndex = (page - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.filteredLeaderboard.length);
    this.displayedLeaderboard = this.filteredLeaderboard.slice(startIndex, endIndex);
  }
  
  /**
   * Gets the total number of pages
   */
  get totalPages(): number {
    return Math.ceil(this.filteredLeaderboard.length / this.pageSize);
  }
  
  /**
   * Gets an array of page numbers for the pagination UI
   */  getPageNumbers(): number[] {
    const pageNumbers: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  }
  
  /**
   * Format time in seconds to readable format (HH:MM:SS)
   */
  formatTime(seconds?: number): string {
    if (!seconds) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    const parts = [];
    
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    
    if (minutes > 0 || hours > 0) {
      parts.push(`${minutes}m`);
    }
    
    parts.push(`${remainingSeconds}s`);
    
    return parts.join(' ');
  }

  /**
   * Navigate to a user's public profile
   */
  viewUserProfile(username: string): void {
    if (username) {
      this.router.navigate(['/user', username]);
    }
  }

  /**
   * Check if user profile can be viewed (has username)
   */
  canViewProfile(entry: LeaderboardEntry): boolean {
    return !!(entry.username && entry.username.trim());
  }
}
