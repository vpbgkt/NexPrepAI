import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PublicProfileStats {
  testsCompleted: number;
  averageScore: number;
  maxScore: number;
}

export interface PublicProfileStreaks {
  currentStreak: number;
  longestStreak: number;
  studyStreak: number;
  longestStudyStreak: number;
}

export interface PublicProfile {
  username: string;
  name: string;
  displayName: string;
  photoURL?: string;
  joinedAt: Date;
  stats: PublicProfileStats;
  streaks: PublicProfileStreaks;
}

export interface PublicProfileResponse {
  success: boolean;
  data?: PublicProfile;
  message?: string;
}

export interface UsernameCheckResponse {
  success: boolean;
  exists: boolean;
  username: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PublicProfileService {
  private apiUrl = `${environment.apiUrl}/public`;

  constructor(private http: HttpClient) {}

  /**
   * Get public profile by username
   * @param username - The username to look up
   * @returns Observable containing the public profile data
   */
  getPublicProfile(username: string): Observable<PublicProfileResponse> {
    return this.http.get<PublicProfileResponse>(`${this.apiUrl}/profile/${username}`);
  }

  /**
   * Check if a username exists
   * @param username - The username to check
   * @returns Observable containing existence check result
   */
  checkUsername(username: string): Observable<UsernameCheckResponse> {
    return this.http.get<UsernameCheckResponse>(`${this.apiUrl}/check-username/${username}`);
  }
}
