import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

interface AuthResponse { 
  token: string; 
  role: string; 
  name?: string; // Added
  email?: string; // Added
}
interface BackendUser { // Define a more specific type for the user object from backend
  _id: string;
  email: string;
  name: string;
  role: string;
  photoURL?: string;
  // Add other fields your backend user object might have
}

interface FirebaseSignInResponse {
  token: string;
  user: BackendUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = 'http://localhost:5000/api/auth';

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, { email, password })
      .pipe(tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('role',  res.role);
        if (res.name) localStorage.setItem('appUserName', res.name); // Store name
        if (res.email) localStorage.setItem('appUserEmail', res.email); // Store email
        // Navigate after successful traditional login
        // this.router.navigate([this.getRedirectUrl(res.role)]); // Consider centralizing navigation
      }));
  }

  // New method to handle successful Firebase sign-in & backend token exchange
  handleFirebaseLogin(token: string, user: BackendUser) {
    if (!user) {
      console.error("User object is undefined in handleFirebaseLogin");
      return;
    }
    
    localStorage.setItem('token', token);
    localStorage.setItem('role', user.role || 'student'); // Provide a default role if undefined
    if (user.name) localStorage.setItem('appUserName', user.name); // Also store for consistency
    if (user.email) localStorage.setItem('appUserEmail', user.email); // Also store for consistency
    // User object from backend might contain more details like name, photoURL, etc.
    // localStorage.setItem('userName', user.name); // Example
    // localStorage.setItem('userPhoto', user.photoURL || ''); // Example

    // Navigation should ideally happen here or be triggered from here
    // to ensure consistency after any successful login (Firebase or traditional).
    // For now, FirebaseAuthService handles navigation after Firebase login.
    // If you want to centralize it, FirebaseAuthService would call this method,
    // and this method would then navigate.
  }
  register(name: string, username: string, email: string, password: string, referralCode?: string) { // Added optional referralCode parameter
    // student self-registration; always gets role=student
    const payload: any = { name, username, email, password };
    if (referralCode && referralCode.trim()) {
      payload.referralCodeInput = referralCode.trim();
    }
    return this.http.post(`${this.base}/register`, payload);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('appUserName'); // Clear name
    localStorage.removeItem('appUserEmail'); // Clear email
    this.router.navigate(['/login']);
  }

  isLoggedIn() {
    return !!localStorage.getItem('token');
  }

  getRole() {
    return localStorage.getItem('role');
  }
  // New getter methods
  getAppUserName(): string | null {
    return localStorage.getItem('appUserName');
  }

  getAppUserEmail(): string | null {
    return localStorage.getItem('appUserEmail');
  }
  // Get user's referral information
  getReferralInfo() {
    return this.http.get(`${this.base}/referral-info`);
  }

  // Apply referral code after registration
  applyReferralCode(referralCode: string) {
    return this.http.post(`${this.base}/apply-referral-code`, { referralCode });
  }
}