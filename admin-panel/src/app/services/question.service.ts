import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Question } from '../models/question.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QuestionService {

  constructor(private http: HttpClient) {}

  addQuestion(question: Question): Observable<any> {
    const token = localStorage.getItem('token'); // fetch token dynamically
    return this.http.post('https://organic-sniffle-q576r964xp934w59-5000.app.github.dev/api/questions/add'
, question, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }
}
