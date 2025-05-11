import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

interface AuthResponse { 
  token: string; 
  role: string; 
  name: string; // Added name field
  userId: string; // Assuming userId is also useful
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl + '/auth';
  private role$  = new BehaviorSubject<string | null>(localStorage.getItem('role'));
  private userName$ = new BehaviorSubject<string | null>(localStorage.getItem('userName')); // Added for user name

  constructor(private http: HttpClient) {}

  register(data: { username: string; email: string; password: string; role?: string }) {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('role',  res.role);
        localStorage.setItem('userName', res.name); // Store user's name
        localStorage.setItem('userId', res.userId); // Store userId
        this.role$.next(res.role);
        this.userName$.next(res.name); // Update BehaviorSubject
      }));
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName'); // Clear user's name
    localStorage.removeItem('userId');
    this.role$.next(null);
    this.userName$.next(null); // Clear BehaviorSubject
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }

  getUserName(): string | null { // Added method to get user's name
    return localStorage.getItem('userName');
  }

  getUserNameObservable(): Observable<string | null> { // Added observable for name
    return this.userName$.asObservable();
  }

  getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
