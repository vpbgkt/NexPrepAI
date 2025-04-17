import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuestionListComponent } from './components/question-list/question-list.component';
import { AddQuestionComponent } from './components/add-question/add-question.component';
import { LoginComponent } from './components/login/login.component';
import { EditQuestionComponent } from './components/edit-question/edit-question.component';
import { AddBranchComponent } from './components/add-branch/add-branch.component';
import { AddSubjectComponent } from './components/add-subject.component';
import { authGuard } from './gaurds/auth.gaurd';
import { AddTopicComponent } from './components/add-topic.component';
import { AddSubtopicComponent } from './components/add-subtopic.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'questions', component: QuestionListComponent, canActivate: [authGuard] },
  { path: 'add-question', component: AddQuestionComponent, canActivate: [authGuard] },
  { path: 'questions/edit/:id', component: EditQuestionComponent, canActivate: [authGuard] },
  { path: 'branches/new', component: AddBranchComponent, canActivate: [authGuard] },
  { path: 'subjects/new', component: AddSubjectComponent },
  { path: 'topics/new', component: AddTopicComponent },
  { path: 'subtopics/new', component: AddSubtopicComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
