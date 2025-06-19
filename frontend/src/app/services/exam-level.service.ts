import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ExamLevel {
  _id: string;
  family: {
    _id: string;
    code: string;
    name: string;
  };
  name: string;
  code: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ExamLevelService {
  private apiUrl = `${environment.apiUrl}/examLevels`;

  constructor(private http: HttpClient) {}

  /**
   * Get all exam levels
   */
  getAll(): Observable<ExamLevel[]> {
    return this.http.get<ExamLevel[]>(this.apiUrl);
  }

  /**
   * Get exam levels by family ID
   */
  getByFamily(familyId: string): Observable<ExamLevel[]> {
    return this.http.get<ExamLevel[]>(`${this.apiUrl}?family=${familyId}`);
  }

  /**
   * Get a specific exam level by ID
   */
  getById(id: string): Observable<ExamLevel> {
    return this.http.get<ExamLevel>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create a new exam level
   */
  create(examLevel: Partial<ExamLevel>): Observable<ExamLevel> {
    return this.http.post<ExamLevel>(this.apiUrl, examLevel);
  }

  /**
   * Update an existing exam level
   */
  update(id: string, examLevel: Partial<ExamLevel>): Observable<ExamLevel> {
    return this.http.put<ExamLevel>(`${this.apiUrl}/${id}`, examLevel);
  }

  /**
   * Delete an exam level
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
