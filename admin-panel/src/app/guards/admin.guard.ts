import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.auth.isLoggedIn() && ['admin', 'superadmin'].includes(this.auth.getRole()!)) {
      return true;
    }
    this.router.navigate(['/login']);
    return false;
  }
}
