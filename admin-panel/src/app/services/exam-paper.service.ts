import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ExamPaper {
  _id: string;
  family: string;   // ExamFamily _id
  stream: string;   // ExamStream _id
  code: string;
  name: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class ExamPaperService {
  private base = 'http://localhost:5000/api/examPapers';

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

  /** Create new paper */
  create(paper: Partial<ExamPaper>): Observable<ExamPaper> {
    return this.http.post<ExamPaper>(this.base, paper);
  }
}