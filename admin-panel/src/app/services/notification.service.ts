import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notifications.asObservable();

  private defaultDuration = 5000; // 5 seconds

  constructor() { }

  /**
   * Show a success notification
   */
  showSuccess(title: string, message?: string, duration?: number) {
    this.addNotification({
      type: 'success',
      title,
      message: message || '',
      duration: duration || this.defaultDuration
    });
  }

  /**
   * Show an error notification
   */
  showError(title: string, message?: string, duration?: number) {
    this.addNotification({
      type: 'error',
      title,
      message: message || '',
      duration: duration || 8000 // Errors stay longer
    });
  }

  /**
   * Show a warning notification
   */
  showWarning(title: string, message?: string, duration?: number) {
    this.addNotification({
      type: 'warning',
      title,
      message: message || '',
      duration: duration || 6000
    });
  }

  /**
   * Show an info notification
   */
  showInfo(title: string, message?: string, duration?: number) {
    this.addNotification({
      type: 'info',
      title,
      message: message || '',
      duration: duration || this.defaultDuration
    });
  }

  /**
   * Add a notification to the queue
   */
  private addNotification(notification: Omit<Notification, 'id'>) {
    const id = this.generateId();
    const newNotification: Notification = {
      ...notification,
      id
    };

    const currentNotifications = this.notifications.value;
    this.notifications.next([...currentNotifications, newNotification]);

    // Auto-remove notification after duration
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(id);
      }, notification.duration);
    }
  }

  /**
   * Remove a notification by ID
   */
  removeNotification(id: string) {
    const currentNotifications = this.notifications.value;
    const filteredNotifications = currentNotifications.filter(n => n.id !== id);
    this.notifications.next(filteredNotifications);
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications.next([]);
  }

  /**
   * Generate a unique ID for notifications
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
