import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Question } from '../models/question.model';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuestionService {

  private apiUrl = environment.apiUrl; // ✅ Correct key used

  constructor(private http: HttpClient) {}

  addQuestion(question: Question): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.post(`${this.apiUrl}/questions/add`, question, { headers }); // ✅ Uses this.apiUrl
  }

  getBranches(): Observable<any> {
    return this.http.get(`${this.apiUrl}/hierarchy/branch`);
  }

  getSubjects(branchId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/hierarchy/subject?branchId=${branchId}`);
  }

  getTopics(subjectId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/hierarchy/topic?subjectId=${subjectId}`);
  }

  getSubtopics(topicId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/hierarchy/subtopic?topicId=${topicId}`);
  }
}
