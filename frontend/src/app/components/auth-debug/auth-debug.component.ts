import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-debug',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px; background: #f5f5f5; margin: 20px; border-radius: 8px;">
      <h3>Authentication Debug</h3>
      <div style="margin: 10px 0;">
        <strong>Is Logged In:</strong> {{ isLoggedIn }}
      </div>
      <div style="margin: 10px 0;">
        <strong>Token Exists:</strong> {{ tokenExists }}
      </div>
      <div style="margin: 10px 0;">
        <strong>Token Preview:</strong> {{ tokenPreview }}
      </div>
      <div style="margin: 10px 0;">
        <strong>User Role:</strong> {{ userRole }}
      </div>
      <div style="margin: 10px 0;">
        <strong>User Name:</strong> {{ userName }}
      </div>
      <div style="margin: 10px 0;">
        <strong>User Email:</strong> {{ userEmail }}
      </div>
      <button (click)="refreshData()" style="background: #007bff; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer;">
        Refresh Data
      </button>
    </div>
  `
})
export class AuthDebugComponent implements OnInit {
  isLoggedIn: boolean = false;
  tokenExists: boolean = false;
  tokenPreview: string = '';
  userRole: string | null = null;
  userName: string | null = null;
  userEmail: string | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.refreshData();
  }

  refreshData(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    const token = this.authService.getToken();
    this.tokenExists = !!token;
    this.tokenPreview = token ? token.substring(0, 20) + '...' : 'No token';
    this.userRole = this.authService.getRole();
    this.userName = this.authService.getAppUserName();
    this.userEmail = this.authService.getEmail();
    
    console.log('Auth Debug Data:', {
      isLoggedIn: this.isLoggedIn,
      tokenExists: this.tokenExists,
      tokenPreview: this.tokenPreview,
      userRole: this.userRole,
      userName: this.userName,
      userEmail: this.userEmail
    });
  }
}
