import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ExamPaper {
  _id: string;
  family: string | { _id: string; name: string; code: string };   // Can be populated or just ObjectId
  stream: string | { _id: string; name: string; code: string };   // Can be populated or just ObjectId
  code?: string;    // Optional, can be auto-generated
  name: string;
  description?: string;
  year?: number;
  durationMinutes?: number;
  passingCriteria?: string;
  examDate?: Date;
}

@Injectable({ providedIn: 'root' })
export class ExamPaperService {
  private base = `${environment.apiUrl}/examPapers`;

  constructor(private http: HttpClient) {}

  /** All papers */
  getAll(): Observable<ExamPaper[]> {
    return this.http.get<ExamPaper[]>(this.base);
  }

  /** Only papers for a given stream */
  getByStream(streamId: string): Observable<ExamPaper[]> {
    return this.http.get<ExamPaper[]>(this.base, {
      params: { stream: streamId }
    });
  }

  /** Only papers for a given family - we need to add this API endpoint to the backend */
  getByFamily(familyId: string): Observable<ExamPaper[]> {
    return this.http.get<ExamPaper[]>(this.base, {
      params: { family: familyId }
    });
  }

  /** Get a single paper by ID */
  getById(id: string): Observable<ExamPaper> {
    return this.http.get<ExamPaper>(`${this.base}/${id}`);
  }

  /** Create new paper */
  create(paper: Partial<ExamPaper>): Observable<ExamPaper> {
    return this.http.post<ExamPaper>(this.base, paper);
  }

  /** Update an existing paper */
  update(id: string, paper: Partial<ExamPaper>): Observable<ExamPaper> {
    return this.http.put<ExamPaper>(`${this.base}/${id}`, paper);
  }

  /** Delete a paper */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
