import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Question } from '../models/question.model';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ADDED: Interface for the paginated response
export interface PaginatedQuestionsResponse {
  questions: Question[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

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
  getQuestions(): Observable<Question[]> { // MODIFIED: Return type to Observable<Question[]>
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    // Call the correct endpoint:
    return this.http.get<Question[]>(`${this.apiUrl}/questions/all`, { headers }); // MODIFIED: Specify type for http.get
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
  getQuestionById(id: string): Observable<Question> { // MODIFIED: Return type to Observable<Question>
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<Question>(`${this.apiUrl}/questions/${id}`, { headers }); // MODIFIED: Specify type for http.get
  }

  createSubject(data: { name: string; branchId: string | null }) {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.post(`${this.apiUrl}/hierarchy/subject`, data, { headers });
  }

  createTopic(data: { name: string; subjectId: string | null }) {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.post(`${this.apiUrl}/hierarchy/topic`, data, { headers });
  }

  createSubtopic(data: { name: string; topicId: string | null }) {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.post(`${this.apiUrl}/hierarchy/subtopic`, data, { headers });
  }

  // MODIFIED: Updated to handle pagination parameters and new response structure
  filterQuestions(filters: {
    branch?: string; // Made branch optional as it might not always be selected initially
    subject?: string;
    topic?: string;
    subtopic?: string;
    difficulty?: string;
    type?: string;
    status?: string;
    searchTerm?: string;
    page?: number; // ADDED page
    limit?: number; // ADDED limit
  }): Observable<PaginatedQuestionsResponse> { // MODIFIED return type
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    let params = new HttpParams();

    if (filters.branch) params = params.append('branch', filters.branch);
    if (filters.subject) params = params.append('subject', filters.subject);
    if (filters.topic) params = params.append('topic', filters.topic);
    if (filters.subtopic) params = params.append('subtopic', filters.subtopic);
    if (filters.difficulty) params = params.append('difficulty', filters.difficulty);
    if (filters.type) params = params.append('type', filters.type);
    if (filters.status) params = params.append('status', filters.status);
    if (filters.searchTerm) params = params.append('searchTerm', filters.searchTerm);
    if (filters.page) params = params.append('page', filters.page.toString());
    if (filters.limit) params = params.append('limit', filters.limit.toString());

    return this.http.get<PaginatedQuestionsResponse>(`${this.apiUrl}/questions/filter`, { headers, params });
  }

  importQuestions(qs: any[]): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post(
      `${this.apiUrl}/questions/import-csv`,
      qs,
      { headers }
    );
  }

  getAll(): Observable<Question[]> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<Question[]>(`${this.apiUrl}/questions/all`, { headers });
  }

  /** Fetch list of exam types for the dropdown */
  getExamTypes(): Observable<{ _id: string; code: string; name: string }[]> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<{ _id: string; code: string; name: string }[]>(`${this.apiUrl}/examTypes`, { headers });
  }
}
