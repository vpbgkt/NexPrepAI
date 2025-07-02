import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Notification Container -->
    <div class="fixed top-4 right-4 z-[9999] max-w-sm w-full space-y-3">
      <div
        *ngFor="let notification of notifications; trackBy: trackByNotification"
        class="notification-item transform transition-all duration-300 ease-out"
        [class]="getNotificationClasses(notification)"
        [id]="'notification-' + notification.id"
      >
        <!-- Notification Content -->
        <div class="flex items-start space-x-3 p-4">
          <!-- Icon -->
          <div class="flex-shrink-0 pt-0.5">
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center text-white"
              [class]="getIconClasses(notification.type)"
            >
              <i [class]="getIconName(notification.type)" class="text-sm"></i>
            </div>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h4 class="text-sm font-semibold text-gray-900 mb-1">
                  {{ notification.title }}
                </h4>
                <p
                  *ngIf="notification.message"
                  class="text-sm text-gray-600 leading-relaxed"
                >
                  {{ notification.message }}
                </p>
              </div>

              <!-- Close Button -->
              <button
                (click)="closeNotification(notification.id)"
                class="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <i class="fas fa-times text-sm"></i>
              </button>
            </div>

            <!-- Action Button -->
            <div *ngIf="notification.action" class="mt-3">
              <button
                (click)="notification.action!.callback(); closeNotification(notification.id)"
                class="text-sm font-medium text-primary-600 hover:text-primary-800 transition-colors duration-200"
              >
                {{ notification.action.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Progress Bar (for timed notifications) -->
        <div
          *ngIf="notification.duration && notification.duration > 0"
          class="h-1 bg-gray-100"
        >
          <div
            class="h-full transition-all ease-linear"
            [class]="getProgressBarClasses(notification.type)"
            [style.animation]="'shrink ' + notification.duration + 'ms linear'"
          ></div>
        </div>
      </div>
    </div>

    <!-- Animation Styles -->
    <style>
      .notification-item {
        animation: slideInRight 0.3s ease-out;
      }
      
      .notification-item.removing {
        animation: slideOutRight 0.3s ease-in;
      }

      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }

      @keyframes shrink {
        from {
          width: 100%;
        }
        to {
          width: 0%;
        }
      }
    </style>
  `
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription: Subscription = new Subscription();

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.subscription.add(
      this.notificationService.notifications$.subscribe((notifications: Notification[]) => {
        this.notifications = notifications;
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  trackByNotification(index: number, notification: Notification): string {
    return notification.id;
  }

  closeNotification(id: string) {
    // Add removing class for exit animation
    const element = document.getElementById(`notification-${id}`);
    if (element) {
      element.classList.add('removing');
      setTimeout(() => {
        this.notificationService.removeNotification(id);
      }, 300); // Wait for animation to complete
    } else {
      this.notificationService.removeNotification(id);
    }
  }

  getNotificationClasses(notification: Notification): string {
    const baseClasses = 'bg-white rounded-lg shadow-lg border-l-4 overflow-hidden';
    
    switch (notification.type) {
      case 'success':
        return `${baseClasses} border-green-500`;
      case 'error':
        return `${baseClasses} border-red-500`;
      case 'warning':
        return `${baseClasses} border-yellow-500`;
      case 'info':
      default:
        return `${baseClasses} border-blue-500`;
    }
  }

  getIconClasses(type: string): string {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
      default:
        return 'bg-blue-500';
    }
  }

  getIconName(type: string): string {
    switch (type) {
      case 'success':
        return 'fas fa-check';
      case 'error':
        return 'fas fa-times';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      case 'info':
      default:
        return 'fas fa-info';
    }
  }

  getProgressBarClasses(type: string): string {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
      default:
        return 'bg-blue-500';
    }
  }
}
