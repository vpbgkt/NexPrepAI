import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ExamStream {
  _id: string;
  family: string;
  code: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class ExamStreamService {
  private base = 'http://localhost:5000/api/examStreams';

  constructor(private http: HttpClient) {}

  getByFamily(familyId: string): Observable<any[]> {
    return this.http.get<any[]>(this.base, { params: { family: familyId } });
  }
}