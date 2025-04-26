import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuestionListComponent } from './components/question-list/question-list.component';
import { AddQuestionComponent } from './components/add-question/add-question.component';
import { LoginComponent } from './components/login/login.component';
import { EditQuestionComponent } from './components/edit-question/edit-question.component';
import { AddBranchComponent } from './components/add-branch/add-branch.component';
import { AddSubjectComponent } from './components/add-subject.component';
import { AddTopicComponent } from './components/add-topic.component';
import { AddSubtopicComponent } from './components/add-subtopic.component';
import { CsvUploadComponent } from './components/csv-upload/csv-upload.component';
import { TestSeriesListComponent } from './components/test-series-list/test-series-list.component';
import { CreateTestSeriesComponent } from './components/create-test-series/create-test-series.component';
import { BuildPaperComponent } from './components/build-paper/build-paper.component';
import { RegisterComponent } from './components/register/register.component';
import { LogoutComponent } from './components/logout/logout.component';
import { AdminGuard } from './guards/admin.guard';
import { StudentGuard } from './guards/student.guard';
import { StudentDashboardComponent } from './components/student-dashboard/student-dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'logout', component: LogoutComponent },
  { path: 'questions', component: QuestionListComponent },
  { path: 'add-question', component: AddQuestionComponent },
  { path: 'questions/edit/:id', component: EditQuestionComponent },
  { path: 'branches/new', component: AddBranchComponent },
  { path: 'subjects/new', component: AddSubjectComponent },
  { path: 'topics/new', component: AddTopicComponent },
  { path: 'subtopics/new', component: AddSubtopicComponent },
  { path: 'csv-import', component: CsvUploadComponent },
  { path: 'test-series', component: TestSeriesListComponent },
  { path: 'test-series/create', component: CreateTestSeriesComponent },
  { path: 'build-paper', component: BuildPaperComponent },
  { path: 'student-dashboard', component: StudentDashboardComponent, canActivate: [StudentGuard] },

  // all admin pages
  {
    path: '',
    canActivate: [AdminGuard],
    children: [
      { path: 'test-series-list', component: TestSeriesListComponent },
      // …other admin routes…
    ]
  },

  // fallback
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
