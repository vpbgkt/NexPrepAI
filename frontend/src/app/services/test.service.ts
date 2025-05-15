import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TestSeries {
  _id: string;
  title: string;
  mode:       'official' | 'practice' | 'live';  // ★
  maxAttempts: number;                           // ★
  startAt:    string;                            // ISO date string
  endAt:      string;                            // ISO date string
  year?: number;
  enablePublicLeaderboard?: boolean; // Added this field
  // any other fields you need
}

export interface StartTestResponse {
  attemptId: string;
  duration: number; // in minutes
  questions?: any[]; // ← add this line
  sections?: any[]; // your sections from the server
}

export interface LeaderboardEntry {
  rank: number;
  studentInfo: {
    _id: string;
    displayName: string;
    photoURL?: string;
  };
  score: number;
  totalMarks: number;
  percentage: number;
  submittedAt: string; // ISO date string
  timeTakenSeconds: number;
}

@Injectable({ providedIn: 'root' })
export class TestService {
  private base = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  // → New: fetch all test series
  getSeries(): Observable<TestSeries[]> {
    return this.http.get<TestSeries[]>(`${this.base}/testSeries`);
  }

  // → New: start a test
  startTest(seriesId: string): Observable<StartTestResponse> {
    return this.http.post<StartTestResponse>(
      `${this.base}/tests/start`,
      { seriesId }
    );
  }

  // → New: save progress
  saveProgress(attemptId: string, payload: any): Observable<any> {
    return this.http.post<any>(
      `${this.base}/tests/${attemptId}/save`,
      payload
    );
  }

  /** Fetch an in-progress attempt, if any */
  getProgress(seriesId: string) {
    return this.http.get<{
      attemptId?: string;
      remainingDurationSeconds?: number; // Renamed from remainingTime and made optional
      sections?: any[];
      responses?: any[];
      status?: 'in-progress' | 'expired' | 'completed'; // Added status
      duration?: number; // Added duration (total test duration in minutes)
      expired?: boolean; // Kept for backward compatibility if still used, but prefer status
      startedAt?: string; // Added from backend response
      expiresAt?: string; // Added from backend response
      lastSavedAt?: string; // Added from backend response
    }>(`${this.base}/tests/${seriesId}/progress`);
  }

  // existing methods…
  reviewAttempt(attemptId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/tests/${attemptId}/review`);
  }

  getMyAttempts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/tests/my-attempts`);
  }

  submitAttempt(attemptId: string, payload: any): Observable<any> {
    return this.http.post<any>(
      `${this.base}/tests/${attemptId}/submit`,
      payload
    );
  }

  /** New: fetch review details for an attempt */
  getReview(attemptId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/tests/${attemptId}/review`);
  }

  getLeaderboard(seriesId: string): Observable<LeaderboardEntry[]> {
    return this.http.get<LeaderboardEntry[]>(`${this.base}/tests/${seriesId}/leaderboard`);
  }
}