import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TopicService {
  private apiUrl = `${environment.apiUrl}/hierarchy`;

  constructor(private http: HttpClient) {}

  getTopics(subjectId: string): Observable<any[]> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any[]>(
      `${this.apiUrl}/topic?subjectId=${subjectId}`,
      { headers }
    );
  }

  createTopic(name: string, subjectId: string): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post<any>(
      `${this.apiUrl}/topic`,
      { name, subject: subjectId },
      { headers }
    );
  }
}