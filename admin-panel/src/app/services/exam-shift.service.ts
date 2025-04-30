import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ExamShift {
  _id: string;
  paper: string;
  code: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class ExamShiftService {
  private base = 'http://localhost:5000/api/examShifts';

  constructor(private http: HttpClient) {}

  getByPaper(paperId: string): Observable<any[]> {
    return this.http.get<any[]>(this.base, { params: { paper: paperId } });
  }
}