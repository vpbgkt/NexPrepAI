import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ExamStream {
  _id: string;
  family: string;  // ObjectId of the ExamFamily
  code: string;
  name: string;
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

  /** Create a new stream */
  create(stream: Partial<ExamStream>): Observable<ExamStream> {
    return this.http.post<ExamStream>(this.base, stream);
  }
}