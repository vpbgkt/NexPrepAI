import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

  /** Create new paper */
  create(paper: Partial<ExamPaper>): Observable<ExamPaper> {
    return this.http.post<ExamPaper>(this.base, paper);
  }
}