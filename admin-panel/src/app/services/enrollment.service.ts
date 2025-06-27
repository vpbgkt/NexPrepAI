import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EnrollmentResponse {
  success: boolean;
  data?: any;
  message: string;
}

export interface EnrollmentOptions {
  examFamilies: any[];
  examLevels: { [key: string]: any[] };
  examBranches: any[];
}

export interface FilteredBranchesRequest {
  examFamily: string;
  examLevels: string[];
}

export interface CompulsoryEnrollmentRequest {
  examFamily: string;
  examLevels: string[];
  branches: string[];
  compulsoryReason: string;
  targetStudents?: 'all' | string[];
}

@Injectable({
  providedIn: 'root'
})
export class EnrollmentService {
  private apiUrl = 'http://localhost:5000/api/enrollments';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Get enrollment options (exam families, levels, branches)
  getEnrollmentOptions(): Observable<EnrollmentResponse> {
    return this.http.get<EnrollmentResponse>(`${this.apiUrl}/enrollment-options`, {
      headers: this.getHeaders()
    });
  }

  // Get filtered branches based on selected levels
  getFilteredBranches(request: FilteredBranchesRequest): Observable<EnrollmentResponse> {
    return this.http.post<EnrollmentResponse>(`${this.apiUrl}/filtered-branches`, request, {
      headers: this.getHeaders()
    });
  }

  // Create compulsory enrollment (Admin only)
  createCompulsoryEnrollment(request: CompulsoryEnrollmentRequest): Observable<EnrollmentResponse> {
    return this.http.post<EnrollmentResponse>(`${this.apiUrl}/admin/create-compulsory`, request, {
      headers: this.getHeaders()
    });
  }

  // Get all enrollments (Admin only) - placeholder for future implementation
  getAllEnrollments(): Observable<EnrollmentResponse> {
    return this.http.get<EnrollmentResponse>(`${this.apiUrl}/admin/all-enrollments`, {
      headers: this.getHeaders()
    });
  }

  // Get enrollment statistics (Admin only) - placeholder for future implementation
  getAdminEnrollmentStats(): Observable<EnrollmentResponse> {
    return this.http.get<EnrollmentResponse>(`${this.apiUrl}/admin/stats`, {
      headers: this.getHeaders()
    });
  }

  // Deactivate enrollment (Admin only) - placeholder for future implementation
  deactivateEnrollment(enrollmentId: string): Observable<EnrollmentResponse> {
    return this.http.patch<EnrollmentResponse>(`${this.apiUrl}/admin/${enrollmentId}/deactivate`, {}, {
      headers: this.getHeaders()
    });
  }
}
