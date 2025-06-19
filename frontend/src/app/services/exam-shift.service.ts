import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ExamShift {
  _id: string;
  paper: string | { _id: string; name: string; code: string };    // Can be populated or just ObjectId
  code: string;
  name: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class ExamShiftService {
  private base = `${environment.apiUrl}/examShifts`;

  constructor(private http: HttpClient) {}

  /** All shifts */
  getAll(): Observable<ExamShift[]> {
    return this.http.get<ExamShift[]>(this.base);
  }

  /** Shifts for one paper */
  getByPaper(paperId: string): Observable<ExamShift[]> {
    return this.http.get<ExamShift[]>(`${this.base}/by-paper`, {
      params: { paper: paperId }
    });
  }

  /** Create a shift */
  create(shift: Partial<ExamShift>): Observable<ExamShift> {
    return this.http.post<ExamShift>(this.base, shift);
  }

  /** Get a single shift by ID */
  getById(id: string): Observable<ExamShift> {
    return this.http.get<ExamShift>(`${this.base}/${id}`);
  }

  /** Update an existing shift */
  update(id: string, shift: Partial<ExamShift>): Observable<ExamShift> {
    return this.http.put<ExamShift>(`${this.base}/${id}`, shift);
  }

  /** Delete a shift */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
