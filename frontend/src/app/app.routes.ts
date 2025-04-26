import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ExamPlayerComponent } from './components/exam-player/exam-player.component';
import { ReviewAttemptComponent } from './components/review-attempt/review-attempt.component';
import { ReviewComponent } from './components/review/review.component';
import { StudentDashboardComponent } from './components/student-dashboard/student-dashboard.component';
import { TestListComponent } from './components/test-list/test-list.component';
import { studentGuard } from './guards/student.guard';

export const routes: Routes = [
  // Public student routes
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Student‐only pages
  { path: 'exam/:seriesId', component: ExamPlayerComponent, canActivate: [studentGuard] },
  { path: 'review/:attemptId', component: ReviewAttemptComponent, canActivate: [studentGuard] },
  { path: 'dashboard', component: StudentDashboardComponent, canActivate: [studentGuard] },
  { path: 'tests', component: TestListComponent, canActivate: [studentGuard] },

  // Redirect root
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
