import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service'; // Assuming AuthService provides the token
import { environment } from '../../environments/environment'; // Import environment

// Define an interface for the User object based on your backend model
export interface User {
  _id: string;
  username: string;
  name: string;
  email?: string;
  role: 'student' | 'admin' | 'superadmin';
  accountExpiresAt?: string | null;
  freeTrialEndsAt?: string | null;
  createdAt: string;
  // Add any other fields you expect to receive and display
  [key: string]: any; // For flexibility if not all fields are known
}

export interface UserAccountSettingsUpdate {
  accountExpiresAt?: string | null;
  freeTrialEndsAt?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // private apiUrl = '/api/users'; // Old configuration
  private apiUrl = environment.apiUrl + '/users'; // Corrected: Use environment.apiUrl consistent with AuthService

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    // Backend's authMiddleware should handle cases where token is null (e.g. "Bearer null")
    // and respond with a 401, which is appropriate.
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getAllUsers(): Observable<User[]> {
    // Example: if environment.apiUrl = 'http://localhost:5000/api', this calls 'http://localhost:5000/api/users'
    return this.http.get<User[]>(`${this.apiUrl}`, { headers: this.getAuthHeaders() });
  }

  updateUserAccountSettings(userId: string, settings: UserAccountSettingsUpdate): Observable<any> {
    // Example: 'http://localhost:5000/api/users/some-id/account-settings'
    return this.http.put(`${this.apiUrl}/${userId}/account-settings`, settings, { headers: this.getAuthHeaders() });
  }
}
