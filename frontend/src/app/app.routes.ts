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
import { RewardsDashboardComponent } from './components/rewards-dashboard/rewards-dashboard.component';
import { AdminRewardsComponent } from './components/admin-rewards/admin-rewards.component'; // Import AdminRewardsComponent
import { AccountActiveGuard } from './guards/account-active.guard'; // Corrected import: AccountActiveGuard
import { MathTestComponent } from './components/math-test/math-test.component'; // Import MathTestComponent for testing
import { EnrollmentGuard } from './guards/enrollment.guard'; // Import EnrollmentGuard
import { PublicProfileComponent } from './components/public-profile/public-profile.component'; // Import PublicProfileComponent
import { NotificationDemoComponent } from './components/notification-demo/notification-demo.component'; // Import NotificationDemoComponent

export const routes: Routes = [  // Public student routes
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'notification-demo', component: NotificationDemoComponent }, // Notification demo route
  { path: 'leaderboard/:seriesId', component: LeaderboardComponent }, // Public leaderboard route
  { path: 'math-test', component: MathTestComponent }, // Math test component for testing
  { path: 'user/:username', component: PublicProfileComponent }, // Public user profile route
  
  // Student‐only pages
  { path: 'home', component: HomeComponent, canActivate: [studentGuard, EnrollmentGuard] }, // Added EnrollmentGuard
  { path: 'exam/:seriesId', component: ExamPlayerComponent, canActivate: [studentGuard, AccountActiveGuard, EnrollmentGuard] }, // Added EnrollmentGuard
  { path: 'review/:attemptId', component: ReviewComponent, canActivate: [studentGuard, EnrollmentGuard] }, // Added EnrollmentGuard
  { path: 'student/dashboard', component: StudentDashboardComponent, canActivate: [studentGuard, AccountActiveGuard, EnrollmentGuard] }, // Added EnrollmentGuard
  { path: 'tests', component: TestListComponent, canActivate: [studentGuard, AccountActiveGuard, EnrollmentGuard] }, // Added EnrollmentGuard
  { path: 'profile', component: ProfileComponent, canActivate: [studentGuard] }, // Profile page should always be accessible
  { path: 'rewards', component: RewardsDashboardComponent, canActivate: [studentGuard, AccountActiveGuard, EnrollmentGuard] }, // Added EnrollmentGuard

  // Admin-only pages
  { path: 'admin/rewards', component: AdminRewardsComponent, canActivate: [adminGuard] }, // Admin rewards management

  // Redirect root
  { path: '', redirectTo: 'home', pathMatch: 'full' }, // Changed to redirect to home
  { path: '**', redirectTo: 'home' } // Changed to redirect to home
];
