import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ExamTypeService {
  private baseUrl = 'http://localhost:5000';  // or use your environment var

  constructor(private http: HttpClient) {}

  getAll(): Observable<{ _id: string; code: string; name: string }[]> {
    return this.http.get<{ _id: string; code: string; name: string }[]>(
      `${this.baseUrl}/api/examTypes`
    );
  }
}
