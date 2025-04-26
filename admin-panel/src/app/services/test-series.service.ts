import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TestSeries {
  _id:         string;
  title:       string;
  examType:    string;    // or an object if you populate
  duration:    number;
  totalMarks:  number;
  mode:        string;
  maxAttempts: number;
}

@Injectable({ providedIn: 'root' })
export class TestSeriesService {
  private base = 'http://localhost:5000/api/testSeries';

  constructor(private http: HttpClient) {}

  getSeries(): Observable<TestSeries[]> {
    return this.http.get<TestSeries[]>(this.base);
  }

  /** Create a new test series */
  create(payload: Partial<TestSeries>): Observable<TestSeries> {
    return this.http.post<TestSeries>(`${this.base}/create`, payload);
  }
}
