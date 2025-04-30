import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ExamPaper {
  _id: string;
  stream: string;
  code: string;
  name: string;
  year?: number;
}

@Injectable({ providedIn: 'root' })
export class ExamPaperService {
  private base = 'http://localhost:5000/api/examPapers';

  constructor(private http: HttpClient) {}

  getByStream(streamId: string): Observable<any[]> {
    return this.http.get<any[]>(this.base, { params: { stream: streamId } });
  }
}