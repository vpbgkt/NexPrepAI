import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ExamFamily {
  _id: string;
  code: string;
  name: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class ExamFamilyService {
  private base = 'http://localhost:5000/api/examFamilies';

  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.base);
  }
}
