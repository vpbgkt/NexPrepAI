import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface EnrollmentOption {
  _id: string;
  name: string;
  code: string;
  description?: string;
}

export interface EnrollmentData {
  examFamily: string;
  examLevels: string[];
  branches: string[];
  accessLevel?: 'basic' | 'premium';
  preferences?: {
    receiveNotifications: boolean;
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
    preferredLanguage: 'english' | 'hindi' | 'mixed';
  };
}

export interface Enrollment {
  _id: string;
  student: string;
  examFamily: {
    _id: string;
    name: string;
    code: string;
    description: string;
  };
  examLevels: Array<{
    _id: string;
    name: string;
    code: string;
    description: string;
  }>;
  branches: Array<{
    _id: string;
    name: string;
    description: string;
  }>;
  enrollmentType: 'self' | 'admin' | 'compulsory';
  status: 'active' | 'inactive' | 'suspended';
  accessLevel: 'basic' | 'premium' | 'full';
  enrolledAt: Date;
  isCompulsory: boolean;
  preferences: {
    receiveNotifications: boolean;
    difficultyLevel: string;
    preferredLanguage: string;
  };
}

export interface EnrollmentOptions {
  examFamilies: EnrollmentOption[];
  examLevels: { [familyId: string]: EnrollmentOption[] };
  examBranches: EnrollmentOption[];
}

export interface EnrollmentStats {
  totalEnrollments: number;
  activeEnrollments: number;
  basicEnrollments: number;
  premiumEnrollments: number;
  compulsoryEnrollments: number;
  examFamilies: Array<{
    id: string;
    name: string;
    accessLevel: string;
    status: string;
    enrollmentType: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class EnrollmentService {
  private baseUrl = `${environment.apiUrl}/enrollments`;
  
  // BehaviorSubjects for reactive data
  private enrollmentsSubject = new BehaviorSubject<Enrollment[]>([]);
  private enrollmentStatsSubject = new BehaviorSubject<EnrollmentStats | null>(null);
  private enrollmentOptionsSubject = new BehaviorSubject<EnrollmentOptions | null>(null);

  // Observables
  public enrollments$ = this.enrollmentsSubject.asObservable();
  public enrollmentStats$ = this.enrollmentStatsSubject.asObservable();
  public enrollmentOptions$ = this.enrollmentOptionsSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get current user's enrollments
   */
  getMyEnrollments(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/my-enrollments`).pipe(
      tap(response => {
        if (response.success) {
          this.enrollmentsSubject.next(response.data);
        }
      })
    );
  }

  /**
   * Get enrollment options (exam families, levels, branches)
   */
  getEnrollmentOptions(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/enrollment-options`).pipe(
      tap(response => {
        if (response.success) {
          this.enrollmentOptionsSubject.next(response.data);
        }
      })
    );
  }

  /**
   * Create new enrollment
   */
  createEnrollment(enrollmentData: EnrollmentData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/enroll`, enrollmentData).pipe(
      tap(response => {
        if (response.success) {
          // Refresh enrollments after creation
          this.refreshEnrollments();
        }
      })
    );
  }

  /**
   * Update existing enrollment
   */
  updateEnrollment(enrollmentId: string, updateData: Partial<EnrollmentData>): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${enrollmentId}`, updateData).pipe(
      tap(response => {
        if (response.success) {
          // Refresh enrollments after update
          this.refreshEnrollments();
        }
      })
    );
  }

  /**
   * Delete enrollment
   */
  deleteEnrollment(enrollmentId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${enrollmentId}`).pipe(
      tap(response => {
        if (response.success) {
          // Refresh enrollments after deletion
          this.refreshEnrollments();
        }
      })
    );
  }

  /**
   * Check access to specific exam family
   */
  checkAccess(examFamilyId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/check-access/${examFamilyId}`);
  }

  /**
   * Get enrollment statistics
   */
  getEnrollmentStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/stats`).pipe(
      tap(response => {
        if (response.success) {
          this.enrollmentStatsSubject.next(response.data);
        }
      })
    );
  }

  /**
   * Refresh all enrollment data
   */
  refreshEnrollments(): void {
    this.getMyEnrollments().subscribe();
    this.getEnrollmentStats().subscribe();
  }

  /**
   * Check if user has any active enrollments
   */
  hasActiveEnrollments(): boolean {
    const enrollments = this.enrollmentsSubject.value;
    return enrollments.length > 0 && enrollments.some(e => e.status === 'active');
  }

  /**
   * Check if user has access to specific exam family
   */
  hasAccessToExamFamily(examFamilyId: string): boolean {
    const enrollments = this.enrollmentsSubject.value;
    return enrollments.some(e => 
      e.examFamily._id === examFamilyId && 
      e.status === 'active'
    );
  }

  /**
   * Get enrollments for specific exam family
   */
  getEnrollmentForExamFamily(examFamilyId: string): Enrollment | null {
    const enrollments = this.enrollmentsSubject.value;
    return enrollments.find(e => e.examFamily._id === examFamilyId) || null;
  }

  /**
   * Get basic access level enrollments
   */
  getBasicEnrollments(): Enrollment[] {
    const enrollments = this.enrollmentsSubject.value;
    return enrollments.filter(e => e.accessLevel === 'basic' && e.status === 'active');
  }

  /**
   * Get premium enrollments
   */
  getPremiumEnrollments(): Enrollment[] {
    const enrollments = this.enrollmentsSubject.value;
    return enrollments.filter(e => e.accessLevel === 'premium' || e.accessLevel === 'full');
  }

  /**
   * Clear enrollment data (for logout)
   */
  clearEnrollmentData(): void {
    this.enrollmentsSubject.next([]);
    this.enrollmentStatsSubject.next(null);
    this.enrollmentOptionsSubject.next(null);
  }

  /**
   * Initialize enrollment data
   */
  initializeEnrollmentData(): void {
    this.getMyEnrollments().subscribe();
    this.getEnrollmentStats().subscribe();
    this.getEnrollmentOptions().subscribe();
  }

  /**
   * Get filtered exam branches based on exam family and levels
   */
  getFilteredExamBranches(examFamily: string, examLevels: string[] = []): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/filtered-branches`, {
      examFamily,
      examLevels
    });
  }
}
