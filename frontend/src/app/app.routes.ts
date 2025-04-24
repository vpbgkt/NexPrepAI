import { Routes } from '@angular/router';
import { ExamPlayerComponent } from './components/exam-player/exam-player.component';
import { ReviewAttemptComponent } from './components/review-attempt/review-attempt.component';
import { ReviewComponent } from './components/review/review.component';
import { StudentDashboardComponent } from './components/student-dashboard/student-dashboard.component';

export const routes: Routes = [
  { path: 'exam/:seriesId', component: ExamPlayerComponent },
  { path: 'review/:attemptId', component: ReviewAttemptComponent },
  { path: 'dashboard', component: StudentDashboardComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];
