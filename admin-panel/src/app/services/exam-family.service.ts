import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ExamFamily {
  _id: string;
  code?: string;
  name: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class ExamFamilyService {
  private base = `${environment.apiUrl}/examFamilies`;

  constructor(private http: HttpClient) {}

  /** Fetch all families */
  getAll(): Observable<ExamFamily[]> {
    return this.http.get<ExamFamily[]>(this.base);
  }

  /** Create a new family */
  create(family: Partial<ExamFamily>): Observable<ExamFamily> {
    return this.http.post<ExamFamily>(this.base, family);
  }
}
