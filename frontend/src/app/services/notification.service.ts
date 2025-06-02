import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new BehaviorSubject<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  notification$ = this.notificationSubject.asObservable();

  constructor() { }

  /**
   * Show a success notification
   * @param message The message to display
   */
  showSuccess(message: string): void {
    this.notificationSubject.next({ message, type: 'success' });
    this.autoHideNotification();
  }

  /**
   * Show an error notification
   * @param message The message to display
   */
  showError(message: string): void {
    this.notificationSubject.next({ message, type: 'error' });
    this.autoHideNotification();
  }

  /**
   * Show an info notification
   * @param message The message to display
   */
  showInfo(message: string): void {
    this.notificationSubject.next({ message, type: 'info' });
    this.autoHideNotification();
  }

  /**
   * Show a warning notification
   * @param message The message to display
   */
  showWarning(message: string): void {
    this.notificationSubject.next({ message, type: 'warning' });
    this.autoHideNotification();
  }

  /**
   * Clear the current notification
   */
  clearNotification(): void {
    this.notificationSubject.next(null);
  }

  /**
   * Auto-hide notification after a delay
   */
  private autoHideNotification(): void {
    setTimeout(() => {
      this.clearNotification();
    }, 5000); // Hide after 5 seconds
  }
}