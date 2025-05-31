import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ExamPlayerComponent } from './components/exam-player/exam-player.component';
import { ReviewAttemptComponent } from './components/review-attempt/review-attempt.component';
import { ReviewComponent } from './components/review/review.component';
import { StudentDashboardComponent } from './components/student-dashboard/student-dashboard.component';
import { TestListComponent } from './components/test-list/test-list.component';
import { studentGuard } from './guards/student.guard';
import { adminGuard } from './guards/admin.guard'; // Import AdminGuard
import { ProfileComponent } from './components/profile/profile.component'; // Import ProfileComponent
import { LeaderboardComponent } from './components/leaderboard/leaderboard.component'; // Import LeaderboardComponent
import { HomeComponent } from './components/home/home.component'; // Import HomeComponent
import { RewardsDashboardComponent } from './components/rewards-dashboard/rewards-dashboard.component'; // Import RewardsDashboardComponent
import { AdminRewardsComponent } from './components/admin-rewards/admin-rewards.component'; // Import AdminRewardsComponent
import { accountActiveGuard } from './guards/account-active.guard'; // Import the new guard

export const routes: Routes = [
  // Public student routes
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'leaderboard/:seriesId', component: LeaderboardComponent }, // Public leaderboard route
  
  // Student‐only pages
  { path: 'home', component: HomeComponent, canActivate: [studentGuard] }, // Added home route
  { path: 'exam/:seriesId', component: ExamPlayerComponent, canActivate: [studentGuard, accountActiveGuard] }, // Added accountActiveGuard
  { path: 'review/:attemptId', component: ReviewComponent, canActivate: [studentGuard] }, // Assuming review doesn't need active account, or add guard if it does
  { path: 'student/dashboard', component: StudentDashboardComponent, canActivate: [studentGuard, accountActiveGuard] }, // Added accountActiveGuard
  { path: 'tests', component: TestListComponent, canActivate: [studentGuard, accountActiveGuard] }, // Added accountActiveGuard
  { path: 'profile', component: ProfileComponent, canActivate: [studentGuard] }, // Profile page should be accessible to see status
  { path: 'rewards', component: RewardsDashboardComponent, canActivate: [studentGuard, accountActiveGuard] }, // Added accountActiveGuard

  // Admin-only pages
  { path: 'admin/rewards', component: AdminRewardsComponent, canActivate: [adminGuard] }, // Admin rewards management

  // Redirect root
  { path: '', redirectTo: 'home', pathMatch: 'full' }, // Changed to redirect to home
  { path: '**', redirectTo: 'home' } // Changed to redirect to home
];
