import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Define an interface for the user profile data
export interface UserProfile {
  _id?: string;
  username?: string;
  name: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  role?: string;
  // Add any other fields you expect from the backend
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = '/api/users'; // Adjust if your API base URL is different

  constructor(private http: HttpClient) { }

  getMyProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/profile/me`);
  }

  updateMyProfile(profileData: UserProfile): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/profile/me`, profileData);
  }
}
