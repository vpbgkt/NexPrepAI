import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QuestionService {
  private apiUrl = 'http://localhost:5000/api/questions'; // Updated API endpoint

  constructor(private http: HttpClient) {}

  getAllQuestions(): Observable<any> { // Renamed method and updated endpoint
    return this.http.get(`${this.apiUrl}/all`);
  }

  addQuestion(data: any): Observable<any> { // Updated method signature and endpoint
    return this.http.post(`${this.apiUrl}/add`, data);
  }
}
