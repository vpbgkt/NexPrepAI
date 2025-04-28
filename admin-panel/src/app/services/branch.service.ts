import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BranchService {
  private apiUrl = `${environment.apiUrl}/hierarchy`;

  constructor(private http: HttpClient) {}

  getBranches(): Observable<any[]> {
    const token = localStorage.getItem('token')!;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any[]>(`${this.apiUrl}/branch`, { headers });
  }

  createBranch(name: string): Observable<any> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` });
    return this.http.post<any>(`${this.apiUrl}/branch`, { name }, { headers });
  }
}