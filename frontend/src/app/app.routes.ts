import { Routes } from '@angular/router';
import { ExamPlayerComponent } from './components/exam-player/exam-player.component';
import { ReviewComponent } from './components/review/review.component';

export const routes: Routes = [
  { path: 'exam/:seriesId', component: ExamPlayerComponent },
  { path: 'review/:attemptId', component: ReviewComponent },
];
