import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ExamShift {
  _id: string;
  paper: string;    // ExamPaper _id
  code: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class ExamShiftService {
  private base = 'http://localhost:5000/api/examShifts';

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
}