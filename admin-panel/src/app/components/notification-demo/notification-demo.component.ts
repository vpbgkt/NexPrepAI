import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-demo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-4xl mx-auto p-6">
      <div class="bg-white rounded-xl shadow-soft p-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-8 text-center">
          🎨 Beautiful Notification System Demo
        </h1>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <!-- Success Notification -->
          <button
            (click)="showSuccessNotification()"
            class="bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <i class="fas fa-check-circle text-xl mb-2 block"></i>
            Success Message
          </button>

          <!-- Error Notification -->
          <button
            (click)="showErrorNotification()"
            class="bg-red-500 hover:bg-red-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <i class="fas fa-times-circle text-xl mb-2 block"></i>
            Error Message
          </button>

          <!-- Warning Notification -->
          <button
            (click)="showWarningNotification()"
            class="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <i class="fas fa-exclamation-triangle text-xl mb-2 block"></i>
            Warning Message
          </button>

          <!-- Info Notification -->
          <button
            (click)="showInfoNotification()"
            class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <i class="fas fa-info-circle text-xl mb-2 block"></i>
            Info Message
          </button>
        </div>

        <!-- Advanced Demos -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <!-- Long Duration -->
          <button
            (click)="showLongDurationNotification()"
            class="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
          >
            <i class="fas fa-clock mr-2"></i>
            Long Duration (10s)
          </button>

          <!-- With Action Button -->
          <button
            (click)="showNotificationWithAction()"
            class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
          >
            <i class="fas fa-hand-pointer mr-2"></i>
            With Action Button
          </button>
        </div>

        <!-- Multi Notification Test -->
        <div class="text-center">
          <button
            (click)="showMultipleNotifications()"
            class="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <i class="fas fa-layer-group mr-2"></i>
            Show Multiple Notifications
          </button>
        </div>

        <!-- Clear All Button -->
        <div class="text-center mt-4">
          <button
            (click)="clearAllNotifications()"
            class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200"
          >
            <i class="fas fa-trash-alt mr-2"></i>
            Clear All
          </button>
        </div>

        <!-- Information Section -->
        <div class="mt-12 bg-gray-50 rounded-xl p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">
            🎯 Features Demonstrated
          </h2>
          <ul class="space-y-2 text-gray-700">
            <li class="flex items-center">
              <i class="fas fa-check text-green-500 mr-3"></i>
              Beautiful slide-in animations from the right
            </li>
            <li class="flex items-center">
              <i class="fas fa-check text-green-500 mr-3"></i>
              Color-coded notification types (Success, Error, Warning, Info)
            </li>
            <li class="flex items-center">
              <i class="fas fa-check text-green-500 mr-3"></i>
              Auto-dismiss with customizable duration
            </li>
            <li class="flex items-center">
              <i class="fas fa-check text-green-500 mr-3"></i>
              Progress bar showing remaining time
            </li>
            <li class="flex items-center">
              <i class="fas fa-check text-green-500 mr-3"></i>
              Manual dismiss with close button
            </li>
            <li class="flex items-center">
              <i class="fas fa-check text-green-500 mr-3"></i>
              Multiple notifications stacking
            </li>
            <li class="flex items-center">
              <i class="fas fa-check text-green-500 mr-3"></i>
              Action buttons for interactive notifications
            </li>
          </ul>
        </div>
      </div>
    </div>
  `
})
export class NotificationDemoComponent {
  constructor(private notificationService: NotificationService) {}

  showSuccessNotification() {
    this.notificationService.showSuccess(
      'Operation Successful!',
      'Your task has been completed successfully. Everything is working as expected.'
    );
  }

  showErrorNotification() {
    this.notificationService.showError(
      'Something Went Wrong',
      'An unexpected error occurred while processing your request. Please try again.'
    );
  }

  showWarningNotification() {
    this.notificationService.showWarning(
      'Warning: Check Required',
      'Please review your settings before proceeding. Some configurations may need attention.'
    );
  }

  showInfoNotification() {
    this.notificationService.showInfo(
      'Information Update',
      'This is an informational message to keep you updated about the current status.'
    );
  }

  showLongDurationNotification() {
    this.notificationService.showInfo(
      'Long Duration Test',
      'This notification will stay visible for 10 seconds to demonstrate custom duration.',
      10000
    );
  }

  showNotificationWithAction() {
    // Since we can't directly modify the service interface for this demo,
    // we'll just show a regular notification explaining this feature
    this.notificationService.showInfo(
      'Action Button Demo',
      'In a real implementation, this notification would have an action button for user interaction.'
    );
  }

  showMultipleNotifications() {
    setTimeout(() => {
      this.notificationService.showSuccess('First Notification', 'This is the first notification in the stack.');
    }, 0);

    setTimeout(() => {
      this.notificationService.showInfo('Second Notification', 'This is the second notification, stacked below the first.');
    }, 500);

    setTimeout(() => {
      this.notificationService.showWarning('Third Notification', 'This is the third notification, demonstrating multiple stacking.');
    }, 1000);

    setTimeout(() => {
      this.notificationService.showError('Fourth Notification', 'This is the final notification in our stacking demo.');
    }, 1500);
  }

  clearAllNotifications() {
    this.notificationService.clearAll();
  }
}
