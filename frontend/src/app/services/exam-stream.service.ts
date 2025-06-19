import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ExamStream {
  _id: string;
  family: string | { _id: string; name: string; code: string };  // Can be populated or just ObjectId
  level: string | { _id: string; name: string; code: string };   // Can be populated or just ObjectId
  branch: string | { _id: string; name: string; code: string };  // Can be populated or just ObjectId
  code?: string;   // Optional, can be auto-generated
  name: string;
  conductingAuthority?: string;
  region?: string;
  language?: string;
  status?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class ExamStreamService {
  private base = `${environment.apiUrl}/examStreams`;

  constructor(private http: HttpClient) {}

  /** List all streams */
  getAll(): Observable<ExamStream[]> {
    return this.http.get<ExamStream[]>(this.base);
  }

  /** List streams filtered by family (optional) */
  getByFamily(familyId: string): Observable<ExamStream[]> {
    return this.http.get<ExamStream[]>(this.base, { params: { family: familyId } });
  }
  
  /** List streams filtered by level */
  getByLevel(levelId: string): Observable<ExamStream[]> {
    return this.http.get<ExamStream[]>(this.base, { params: { level: levelId } });
  }

  /** List streams filtered by branch */
  getByBranch(branchId: string): Observable<ExamStream[]> {
    return this.http.get<ExamStream[]>(this.base, { params: { branch: branchId } });
  }

  /** Get a single stream by ID */
  getById(id: string): Observable<ExamStream> {
    return this.http.get<ExamStream>(`${this.base}/${id}`);
  }

  /** Create a new stream */
  create(stream: Partial<ExamStream>): Observable<ExamStream> {
    return this.http.post<ExamStream>(this.base, stream);
  }

  /** Update an existing stream */
  update(id: string, stream: Partial<ExamStream>): Observable<ExamStream> {
    return this.http.put<ExamStream>(`${this.base}/${id}`, stream);
  }

  /** Delete a stream */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
