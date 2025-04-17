import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TestSeries {
  _id?: string;
  name: string;
  branchId: string;
  subjectId?: string;
  topicId?: string;
  subtopicId?: string;
  questionCount: number;
  durationMinutes: number;
  totalMarks: number;
  negativeMarks?: number;
  // any other fields you need
}

@Injectable({ providedIn: 'root' })
export class TestSeriesService {
  private baseUrl = `${environment.apiUrl}/testSeries`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<TestSeries[]> {
    return this.http.get<TestSeries[]>(this.baseUrl);   // GET /api/testSeries
  }

  create(series: TestSeries): Observable<TestSeries> {
    return this.http.post<TestSeries>(`${this.baseUrl}/create`, series);
  }

  update(id: string, series: TestSeries): Observable<TestSeries> {
    return this.http.put<TestSeries>(`${this.baseUrl}/update/${id}`, series);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/delete/${id}`);
  }

  clone(id: string): Observable<TestSeries> {
    return this.http.post<TestSeries>(`${this.baseUrl}/clone/${id}`, {});
  }
}
