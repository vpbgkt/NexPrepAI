import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { PublicProfileService, PublicProfile } from '../../services/public-profile.service';

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto">
        
        <!-- Loading State -->
        <div *ngIf="loading" class="flex justify-center items-center py-20">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-blue-700 font-medium">Loading profile...</span>
          </div>
        </div>

        <!-- Error State -->
        <div *ngIf="error && !loading" class="text-center py-20">
          <div class="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md mx-auto">
            <div class="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <h2 class="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h2>
            <p class="text-gray-600 mb-6">{{ error }}</p>
            <button 
              (click)="goHome()"
              class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition duration-200">
              Go to Home
            </button>
          </div>
        </div>

        <!-- Profile Content -->
        <div *ngIf="profile && !loading && !error">
          <!-- Profile Header -->
          <div class="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
            <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-8 text-center relative">
              <div class="absolute inset-0 bg-black opacity-10"></div>
              <div class="relative z-10">
                <!-- Profile Photo -->
                <div class="flex justify-center mb-4">
                  <div class="relative">
                    <img 
                      *ngIf="profile.photoURL" 
                      [src]="profile.photoURL" 
                      [alt]="profile.displayName + ' profile photo'"
                      class="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                      (error)="onImageError($event)">
                    <div 
                      *ngIf="!profile.photoURL" 
                      class="w-24 h-24 rounded-full border-4 border-white bg-blue-100 flex items-center justify-center shadow-lg">
                      <span class="text-3xl font-bold text-blue-600">{{ getInitials() }}</span>
                    </div>
                  </div>
                </div>
                
                <!-- Name and Username -->
                <h1 class="text-3xl font-bold mb-2">{{ profile.displayName }}</h1>
                <p class="text-blue-100 text-lg">{{ '@' + profile.username }}</p>
                <p class="text-blue-200 text-sm mt-2">
                  Member since {{ profile.joinedAt | date:'MMMM yyyy' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <!-- Tests Completed -->
            <div class="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow duration-200">
              <div class="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-1">{{ profile.stats.testsCompleted }}</h3>
              <p class="text-sm text-gray-600">Tests Completed</p>
            </div>

            <!-- Average Score -->
            <div class="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow duration-200">
              <div class="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-1">{{ profile.stats.averageScore }}%</h3>
              <p class="text-sm text-gray-600">Average Score</p>
            </div>

            <!-- Best Score -->
            <div class="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow duration-200">
              <div class="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mx-auto mb-3">
                <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l7 7 7-7M5 21l7-7 7 7"></path>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-1">{{ profile.stats.maxScore }}%</h3>
              <p class="text-sm text-gray-600">Best Score</p>
            </div>

            <!-- Current Streak -->
            <div class="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow duration-200">
              <div class="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-3">
                <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"></path>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-1">{{ profile.streaks.currentStreak }}</h3>
              <p class="text-sm text-gray-600">Current Streak</p>
            </div>
          </div>

          <!-- Streak Details -->
          <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <svg class="w-6 h-6 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"></path>
              </svg>
              Streak Information
            </h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Login Streaks -->
              <div class="border border-gray-200 rounded-lg p-4">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Login Streaks</h3>
                <div class="space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600">Current Streak:</span>
                    <span class="font-semibold text-blue-600">{{ profile.streaks.currentStreak }} days</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600">Longest Streak:</span>
                    <span class="font-semibold text-green-600">{{ profile.streaks.longestStreak }} days</span>
                  </div>
                </div>
              </div>

              <!-- Study Streaks -->
              <div class="border border-gray-200 rounded-lg p-4">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Study Streaks</h3>
                <div class="space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600">Current Study Streak:</span>
                    <span class="font-semibold text-purple-600">{{ profile.streaks.studyStreak }} days</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600">Longest Study Streak:</span>
                    <span class="font-semibold text-indigo-600">{{ profile.streaks.longestStudyStreak }} days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Call to Action for Visitors -->
          <div class="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-center text-white">
            <h2 class="text-2xl font-bold mb-4">Ready to Start Your Own Journey?</h2>
            <p class="text-blue-100 mb-6">Join {{ profile.displayName }} and thousands of other students preparing for competitive exams.</p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                routerLink="/register" 
                class="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition duration-200">
                Get Started for Free
              </a>
              <a 
                routerLink="/home" 
                class="border border-white text-white px-6 py-3 rounded-lg font-medium hover:bg-white hover:text-blue-600 transition duration-200">
                Explore Platform
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-spin {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class PublicProfileComponent implements OnInit, OnDestroy {
  profile: PublicProfile | null = null;
  loading = true;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publicProfileService: PublicProfileService,
    private titleService: Title,
    private metaService: Meta
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const username = params['username'];
      if (username) {
        this.loadProfile(username);
      } else {
        this.error = 'No username provided';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProfile(username: string): void {
    this.loading = true;
    this.error = null;

    this.publicProfileService.getPublicProfile(username).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.profile = response.data;
          this.updateSEO();
        } else {
          this.error = response.message || 'Profile not found';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load profile';
        this.loading = false;
        console.error('Error loading profile:', err);
      }
    });
  }

  private updateSEO(): void {
    if (!this.profile) return;

    // Update page title
    const title = `${this.profile.displayName} (@${this.profile.username}) - NexPrep Student Profile`;
    this.titleService.setTitle(title);

    // Update meta tags
    this.metaService.updateTag({ 
      name: 'description', 
      content: `View ${this.profile.displayName}'s study progress on NexPrep. ${this.profile.stats.testsCompleted} tests completed with ${this.profile.stats.averageScore}% average score. Join thousands of students preparing for competitive exams.` 
    });

    // Open Graph tags
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ 
      property: 'og:description', 
      content: `${this.profile.displayName} has completed ${this.profile.stats.testsCompleted} tests with an average score of ${this.profile.stats.averageScore}% on NexPrep.` 
    });
    this.metaService.updateTag({ property: 'og:type', content: 'profile' });
    this.metaService.updateTag({ property: 'og:url', content: `https://nexprep.ai/user/${this.profile.username}` });
    
    if (this.profile.photoURL) {
      this.metaService.updateTag({ property: 'og:image', content: this.profile.photoURL });
    }

    // Twitter Card tags
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary' });
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ 
      name: 'twitter:description', 
      content: `${this.profile.displayName} - ${this.profile.stats.testsCompleted} tests completed, ${this.profile.stats.averageScore}% average score` 
    });

    // Profile specific meta tags
    this.metaService.updateTag({ property: 'profile:username', content: this.profile.username });
  }

  getInitials(): string {
    if (!this.profile) return 'U';
    
    const displayName = this.profile.displayName || this.profile.name || this.profile.username;
    return displayName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  onImageError(event: any): void {
    // Hide broken image and show initials instead
    event.target.style.display = 'none';
    if (this.profile) {
      this.profile.photoURL = undefined;
    }
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}
