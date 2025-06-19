import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ExamBranch {
  _id: string;
  level: string | { _id: string; name: string; code: string };  // Can be populated or just ObjectId
  code?: string;   // Optional, can be auto-generated
  name: string;
  description?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class ExamBranchService {
  private base = `${environment.apiUrl}/examBranches`;

  constructor(private http: HttpClient) {}

  /** List all branches */
  getAll(): Observable<ExamBranch[]> {
    return this.http.get<ExamBranch[]>(this.base);
  }

  /** List branches filtered by level */
  getByLevel(levelId: string): Observable<ExamBranch[]> {
    return this.http.get<ExamBranch[]>(`${this.base}/by-level`, { params: { level: levelId } });
  }

  /** Get a single branch by ID */
  getById(id: string): Observable<ExamBranch> {
    return this.http.get<ExamBranch>(`${this.base}/${id}`);
  }

  /** Create a new branch */
  create(branch: Partial<ExamBranch>): Observable<ExamBranch> {
    return this.http.post<ExamBranch>(this.base, branch);
  }

  /** Update an existing branch */
  update(id: string, branch: Partial<ExamBranch>): Observable<ExamBranch> {
    return this.http.put<ExamBranch>(`${this.base}/${id}`, branch);
  }

  /** Delete a branch */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
