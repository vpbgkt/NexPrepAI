import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { BackendUser } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AccountActiveGuard {
  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (!this.authService.isLoggedIn()) {
      this.notificationService.showWarning('You must be logged in to access this page.');
      return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    return this.authService.getUserProfile().pipe(
      map((user: BackendUser) => {
        if (!user) {
          this.notificationService.showError('Failed to load user profile. Please try logging in again.');
          return this.router.createUrlTree(['/login']);
        }

        const now = new Date();
        let isAccountActive = false;

        // Check for active subscription
        if (user.accountExpiresAt) {
          const expires = new Date(user.accountExpiresAt);
          if (expires >= now) {
            isAccountActive = true;
          }
        }

        // Check for active free trial if no active subscription
        if (!isAccountActive && user.freeTrialEndsAt) {
          const trialExpires = new Date(user.freeTrialEndsAt);
          if (trialExpires >= now) {
            isAccountActive = true;
          }
        }

        if (isAccountActive) {
          return true;
        } else {
          // Determine appropriate message and redirect
          if (user.accountExpiresAt && new Date(user.accountExpiresAt) < now) {
            this.notificationService.showWarning('Your account has expired. Please renew your subscription.');
            return this.router.createUrlTree(['/profile']); // Or a dedicated subscription page
          }
          
          if (user.freeTrialEndsAt && new Date(user.freeTrialEndsAt) < now) { 
            this.notificationService.showWarning('Your free trial has expired. Please subscribe to continue.');
            return this.router.createUrlTree(['/pricing']); // Or a subscription page
          }
          
          // Default message if no specific expiry found but account is not active
          this.notificationService.showWarning('Your account is not active. Please contact support or check your subscription.');
          return this.router.createUrlTree(['/profile']); 
        }
      }),
      catchError((error: any) => {
        console.error('Error in AccountActiveGuard:', error);
        this.notificationService.showError('An error occurred while checking your account status. Please try again.');
        return of(this.router.createUrlTree(['/login']));
      })
    );
  }
}
