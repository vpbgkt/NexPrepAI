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

  addQuestion(questionData: any): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post(`${this.apiUrl}/questions/add`, questionData, { headers });
  }

  getBranches(): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get(`${this.apiUrl}/hierarchy/branch`, { headers });
  }

  getSubjects(branchId: string): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get(`${this.apiUrl}/hierarchy/subject?branchId=${branchId}`, { headers });
  }

  getTopics(subjectId: string): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get(`${this.apiUrl}/hierarchy/topic?subjectId=${subjectId}`, { headers });
  }

  getSubtopics(topicId: string): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get(`${this.apiUrl}/hierarchy/subtopic?topicId=${topicId}`, { headers });
  }

  // New method to fetch all questions
  getQuestions(): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    // Call the correct endpoint:
    return this.http.get(`${this.apiUrl}/questions/all`, { headers });
  }
  
  /** Delete a question by its ID */
  deleteQuestion(id: string): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.delete(`${this.apiUrl}/questions/${id}`, { headers });
  }
  
  /** Update a question */
  updateQuestion(id: string, questionData: any): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.put(`${this.apiUrl}/questions/${id}`, questionData, { headers });
  }

  /** Fetch one question by ID */
  getQuestionById(id: string): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get(`${this.apiUrl}/questions/${id}`, { headers });
  }
}
