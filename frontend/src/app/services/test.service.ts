import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface StartTestResponse {
  attemptId: string;
  duration: number;
  sections: Array<{
    title: string;
    order: number;
    questions: Array<{
      question: string;
      marks: number;
      questionText: string;
      options: any[];
    }>;
  }>;
}

@Injectable({ providedIn: 'root' })
export class TestService {
  private base = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  getSeries(seriesId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/testSeries/${seriesId}/sections`);
  }

  startTest(seriesId: string): Observable<StartTestResponse> {
    return this.http.post<StartTestResponse>(
      `${this.base}/tests/start`,
      { seriesId }
    );
  }

  submitAttempt(attemptId: string, responses: any[]): Observable<any> {
    // wrap in an object so backend sees { responses: [...] }
    return this.http.post(
      `${this.base}/tests/${attemptId}/submit`,
      { responses }
    );
  }

  reviewAttempt(attemptId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/tests/${attemptId}/review`);
  }
}