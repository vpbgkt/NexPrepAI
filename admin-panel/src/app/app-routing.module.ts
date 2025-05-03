import { NgModule }            from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent }        from './components/login/login.component';
import { RegisterComponent }     from './components/register/register.component';
import { LogoutComponent }       from './components/logout/logout.component';
import { StudentDashboardComponent } from './components/student-dashboard/student-dashboard.component';

import { TestSeriesListComponent }   from './components/test-series-list/test-series-list.component';
import { BuildPaperComponent }       from './components/build-paper/build-paper.component';
import { SeriesAnalyticsComponent }  from './components/series-analytics/series-analytics.component';  // ← analytics

import { QuestionListComponent }      from './components/question-list/question-list.component';
import { AddQuestionComponent }       from './components/add-question/add-question.component';
import { EditQuestionComponent }      from './components/edit-question/edit-question.component';

import { AddBranchComponent }     from './components/add-branch/add-branch.component';
import { AddSubjectComponent }    from './components/add-subject.component';
import { AddTopicComponent } from './components/add-topic.component';
import { AddSubtopicComponent }   from './components/add-subtopic.component';
import { CsvUploadComponent }     from './components/csv-upload/csv-upload.component';

import { ExamFamilyListComponent }   from './components/exam-family/exam-family-list/exam-family-list.component';
import { AddExamFamilyComponent }    from './components/exam-family/add-exam-family/add-exam-family.component';

import { ExamStreamListComponent } from './components/exam-stream/exam-stream-list/exam-stream-list.component';
import { AddExamStreamComponent }  from './components/exam-stream/add-exam-stream/add-exam-stream.component';

import { ExamPaperListComponent } from './components/exam-paper/exam-paper-list/exam-paper-list.component';
import { AddExamPaperComponent }  from './components/exam-paper/add-exam-paper/add-exam-paper.component';

import { ExamShiftListComponent } from './components/exam-shift/exam-shift-list/exam-shift-list.component';
import { AddExamShiftComponent }  from './components/exam-shift/add-exam-shift/add-exam-shift.component';

import { AdminGuard }   from './guards/admin.guard';
import { StudentGuard } from './guards/student.guard';

export const routes: Routes = [
  // Public
  { path: '',            redirectTo: 'login', pathMatch: 'full' },
  { path: 'login',       component: LoginComponent },
  { path: 'register',    component: RegisterComponent },
  { path: 'logout',      component: LogoutComponent },

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
      { path: 'build-paper',          component: BuildPaperComponent },

      // Question bank
      { path: 'questions',            component: QuestionListComponent },
      { path: 'add-question',         component: AddQuestionComponent },
      { path: 'questions/edit/:id',   component: EditQuestionComponent },

      // Hierarchy CRUD
      { path: 'branches/new',   component: AddBranchComponent },
      { path: 'subjects/new',   component: AddSubjectComponent },
      { path: 'topics/new',     component: AddTopicComponent },
      { path: 'subtopics/new',  component: AddSubtopicComponent },
      { path: 'csv-import',     component: CsvUploadComponent },

      // Exam Families
      { path: 'exam-families',      component: ExamFamilyListComponent },
      { path: 'exam-families/new',  component: AddExamFamilyComponent },

      // Exam Streams
      { path: 'exam-streams',     component: ExamStreamListComponent },
      { path: 'exam-streams/new', component: AddExamStreamComponent },

      // Exam Papers
      { path: 'exam-papers',     component: ExamPaperListComponent },
      { path: 'exam-papers/new', component: AddExamPaperComponent },

      // Exam Shifts
      { path: 'exam-shifts',     component: ExamShiftListComponent },
      { path: 'exam-shifts/new', component: AddExamShiftComponent },
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
