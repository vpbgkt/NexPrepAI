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
  type:        string; // official, practice, live
  year:        number | null;
  examBody:    string | null;
  startAt:     Date | null;
  endAt:       Date | null;
  family:      string; // ObjectId reference
  randomizeSectionOrder?: boolean; // ADDED
  sections?:   Array<{
    title: string;
    order: number;
    questions: Array<{
      question: string; // ObjectId reference
      marks: number;
      negativeMarks: number;
    }>;
    questionPool?: string[]; // ADDED - Array of Question ObjectIds
    questionsToSelectFromPool?: number; // ADDED
    randomizeQuestionOrderInSection?: boolean; // ADDED
  }>;
  variants?: Array<{
    code: string;
    sections: Array<{
      title: string;
      order: number;
      questions: Array<{
        question: string; // ObjectId reference
        marks: number;
        negativeMarks: number;
      }>;
      questionPool?: string[]; // ADDED
      questionsToSelectFromPool?: number; // ADDED
      randomizeQuestionOrderInSection?: boolean; // ADDED
    }>;
  }>; // Assuming variants can also have these new section properties
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

  /** Update an existing test series */
  update(id: string, payload: Partial<TestSeries>): Observable<TestSeries> {
    return this.http.put<TestSeries>(`${this.base}/${id}`, payload);
  }
}
