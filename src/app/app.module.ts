import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { QuestionListComponent } from './question-list/question-list.component';
import { AddQuestionComponent } from './add-question/add-question.component';

@NgModule({
  declarations: [
    AppComponent,
    QuestionListComponent,
    AddQuestionComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule  // ✅ Needed for ngModel
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }