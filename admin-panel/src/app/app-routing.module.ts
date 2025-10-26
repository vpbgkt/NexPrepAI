import { NgModule }            from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent }        from './components/login/login.component';
import { RegisterComponent }     from './components/register/register.component';
import { LogoutComponent }       from './components/logout/logout.component';
import { StudentDashboardComponent } from './components/student-dashboard/student-dashboard.component';
import { HomeComponent } from './components/home/home.component'; // Import HomeComponent

import { TestSeriesListComponent }   from './components/test-series-list/test-series-list.component';
import { BuildPaperComponent }       from './components/build-paper/build-paper.component';
import { SeriesAnalyticsComponent }  from './components/series-analytics/series-analytics.component';  // ← analytics

import { QuestionListComponent }      from './components/question-list/question-list.component';
import { AddQuestionComponent }       from './components/add-question/add-question.component';
import { EditQuestionComponent }      from './components/edit-question/edit-question.component';
import { QuestionDetailComponent }    from './components/question-detail/question-detail.component'; // ADDED
import { QuestionReviewComponent }    from './components/question-review/question-review.component'; // Import the review component
import { SmartUploadComponent }       from './components/smart-upload/smart-upload.component'; // Import smart upload component

import { AddBranchComponent }     from './components/add-branch/add-branch.component';
import { AddSubjectComponent }    from './components/add-subject.component';
import { AddTopicComponent } from './components/add-topic.component';
import { AddSubtopicComponent }   from './components/add-subtopic.component';
import { CsvUploadComponent }     from './components/csv-upload/csv-upload.component';

import { ExamFamilyListComponent }   from './components/exam-family/exam-family-list/exam-family-list.component';
import { AddExamFamilyComponent }    from './components/exam-family/add-exam-family/add-exam-family.component';

import { ExamLevelListComponent } from './components/exam-level/exam-level-list/exam-level-list.component';
import { AddExamLevelComponent }  from './components/exam-level/add-exam-level/add-exam-level.component';

import { ExamBranchListComponent } from './components/exam-branch/exam-branch-list/exam-branch-list.component';
import { AddExamBranchComponent }  from './components/exam-branch/add-exam-branch/add-exam-branch.component';

import { ExamStreamListComponent } from './components/exam-stream/exam-stream-list/exam-stream-list.component';
import { AddExamStreamComponent }  from './components/exam-stream/add-exam-stream/add-exam-stream.component';

import { ExamPaperListComponent } from './components/exam-paper/exam-paper-list/exam-paper-list.component';
import { AddExamPaperComponent }  from './components/exam-paper/add-exam-paper/add-exam-paper.component';

import { ExamShiftListComponent } from './components/exam-shift/exam-shift-list/exam-shift-list.component';
import { AddExamShiftComponent }  from './components/exam-shift/add-exam-shift/add-exam-shift.component';

import { HierarchyFlowComponent }    from './components/hierarchy-flow/hierarchy-flow.component';
import { UserManagementComponent } from './components/user-management/user-management.component'; // Import the new UserManagementComponent
import { NotificationDemoComponent } from './components/notification-demo/notification-demo.component'; // Import NotificationDemo

import { AdminGuard }   from './guards/admin.guard';
import { StudentGuard } from './guards/student.guard';
import { superadminGuard } from './guards/superadmin.guard'; // Import the superadmin guard

export const routes: Routes = [
  // Public
  { path: '',            redirectTo: 'home', pathMatch: 'full' }, // Default route now redirects to home
  { path: 'login',       component: LoginComponent },
  { path: 'register',    component: RegisterComponent },
  { path: 'logout',      component: LogoutComponent },
  { path: 'home',        component: HomeComponent, canActivate: [AdminGuard] }, // Add route for HomeComponent

  // Analytics (per-series) at top level
  {
    path: 'series/:seriesId/analytics',
    component: SeriesAnalyticsComponent,
    canActivate: [AdminGuard]
  },

  // Student-only
  {
    path: 'student-dashboard',
    component: StudentDashboardComponent,
    canActivate: [StudentGuard]
  },

  // Admin-only block
  {
    path: '',
    canActivate: [AdminGuard],
    children: [
      // Test Series
      { path: 'test-series',          component: TestSeriesListComponent },
      { path: 'test-series/create',   component: BuildPaperComponent },
      { path: 'build-paper',          component: BuildPaperComponent },      // Question bank
      { path: 'questions',            component: QuestionListComponent },
      { path: 'add-question',         component: AddQuestionComponent },
      { path: 'smart-upload',         component: SmartUploadComponent }, // Smart upload route
      { path: 'questions/edit/:id',   component: EditQuestionComponent },
      { path: 'questions/:id/view',   component: QuestionDetailComponent, canActivate: [AdminGuard] }, // ADDED
      { path: 'questions/review',     component: QuestionReviewComponent, canActivate: [superadminGuard] }, // Protected by superadminGuard      // Hierarchy CRUD
      { path: 'hierarchy-flow',  component: HierarchyFlowComponent }, // Enhanced hierarchy creation flow
      { path: 'branches',       component: HomeComponent, data: { hierarchySection: 'branches' } },
      { path: 'branches/new',   component: AddBranchComponent },
      { path: 'subjects',       component: HomeComponent, data: { hierarchySection: 'subjects' } },
      { path: 'subjects/new',   component: AddSubjectComponent },
      { path: 'topics',         component: HomeComponent, data: { hierarchySection: 'topics' } },
      { path: 'topics/new',     component: AddTopicComponent },
      { path: 'subtopics',      component: HomeComponent, data: { hierarchySection: 'subtopics' } },
      { path: 'subtopics/new',  component: AddSubtopicComponent },
      { path: 'csv-import',     component: CsvUploadComponent },      // Exam Families
      { path: 'exam-families',      component: ExamFamilyListComponent },
      { path: 'exam-families/new',  component: AddExamFamilyComponent },      // Exam Levels
      { path: 'exam-levels',      component: ExamLevelListComponent },
      { path: 'exam-levels/new',  component: AddExamLevelComponent },

      // Exam Branches
      { path: 'exam-branches',     component: ExamBranchListComponent },
      { path: 'exam-branches/new', component: AddExamBranchComponent },

      // Exam Streams
      { path: 'exam-streams',     component: ExamStreamListComponent },
      { path: 'exam-streams/new', component: AddExamStreamComponent },

      // Exam Papers
      { path: 'exam-papers',     component: ExamPaperListComponent },
      { path: 'exam-papers/new', component: AddExamPaperComponent },

      // Exam Shifts
      { path: 'exam-shifts',     component: ExamShiftListComponent },
      { path: 'exam-shifts/new', component: AddExamShiftComponent },

      // User Management (Superadmin only)
      { path: 'user-management', component: UserManagementComponent, canActivate: [AdminGuard] }, // Added route for UserManagement
      { path: 'leaderboard', loadComponent: () => import('./components/leaderboard/leaderboard.component').then(m => m.LeaderboardComponent), canActivate: [AdminGuard] }, // Route for Leaderboard
      
      // Notification Demo
      { path: 'notification-demo', component: NotificationDemoComponent, canActivate: [AdminGuard] }, // Demo for beautiful notifications
    ]
  },

  // Catch-all
  { path: '**', pathMatch: 'full', redirectTo: 'login', data: { reason: 'no-match' } }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
