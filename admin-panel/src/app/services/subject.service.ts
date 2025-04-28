import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private apiUrl = `${environment.apiUrl}/hierarchy`;

  constructor(private http: HttpClient) {}

  // Fetch subjects for a given branch
  getSubjects(branchId: string): Observable<any[]> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any[]>(
      `${this.apiUrl}/subject?branchId=${branchId}`,
      { headers }
    );
  }

  // Create a new subject under a branch
  createSubject(name: string, branchId: string): Observable<any> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post<any>(
      `${this.apiUrl}/subject`,
      { name, branch: branchId },
      { headers }
    );
  }
}