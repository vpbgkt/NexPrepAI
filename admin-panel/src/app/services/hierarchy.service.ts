import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Branch   { _id: string; name: string; }
export interface Subject  { _id: string; name: string; branchId: string; }
export interface Topic    { _id: string; name: string; subjectId: string; }
export interface Subtopic { _id: string; name: string; topicId: string; }

@Injectable({ providedIn: 'root' })
export class HierarchyService {
  private base = `${environment.apiUrl}/hierarchy`;

  constructor(private http: HttpClient) {}

  /** Get all branches */
  getBranches(): Observable<Branch[]> {
    return this.http.get<Branch[]>(`${this.base}/branch`);
  }

  /** Get subjects for a branch */
  getSubjects(branchId: string): Observable<Subject[]> {
    return this.http.get<Subject[]>(`${this.base}/subject`, {
      params: new HttpParams().set('branchId', branchId)
    });
  }

  /** Get topics for a subject */
  getTopics(subjectId: string): Observable<Topic[]> {
    return this.http.get<Topic[]>(`${this.base}/topic`, {
      params: new HttpParams().set('subjectId', subjectId)
    });
  }

  /** Get subtopics for a topic */
  getSubtopics(topicId: string): Observable<Subtopic[]> {
    return this.http.get<Subtopic[]>(`${this.base}/subtopic`, {
      params: new HttpParams().set('topicId', topicId)
    });
  }
}
