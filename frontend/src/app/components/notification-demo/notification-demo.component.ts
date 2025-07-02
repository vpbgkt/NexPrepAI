import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-demo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div class="max-w-4xl mx-auto">
        <div class="bg-white rounded-2xl shadow-xl p-8">
          <h1 class="text-4xl font-bold text-gray-900 mb-4 text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            🚀 NexPrepAI Notification System
          </h1>
          <p class="text-gray-600 text-center mb-12 text-lg">
            Experience our beautiful, modern notification system that replaces boring browser alerts!
          </p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <!-- Success Notification -->
            <div class="text-center">
              <button
                (click)="showSuccessNotification()"
                class="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-6 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg"
              >
                <i class="fas fa-check-circle text-3xl mb-3 block"></i>
                <span class="text-lg">Success</span>
              </button>
              <p class="text-sm text-gray-500 mt-2">Login successful, task completed</p>
            </div>

            <!-- Error Notification -->
            <div class="text-center">
              <button
                (click)="showErrorNotification()"
                class="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold py-6 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg"
              >
                <i class="fas fa-times-circle text-3xl mb-3 block"></i>
                <span class="text-lg">Error</span>
              </button>
              <p class="text-sm text-gray-500 mt-2">Login failed, network error</p>
            </div>

            <!-- Warning Notification -->
            <div class="text-center">
              <button
                (click)="showWarningNotification()"
                class="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-6 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg"
              >
                <i class="fas fa-exclamation-triangle text-3xl mb-3 block"></i>
                <span class="text-lg">Warning</span>
              </button>
              <p class="text-sm text-gray-500 mt-2">Account expiry, incomplete profile</p>
            </div>

            <!-- Info Notification -->
            <div class="text-center">
              <button
                (click)="showInfoNotification()"
                class="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold py-6 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg"
              >
                <i class="fas fa-info-circle text-3xl mb-3 block"></i>
                <span class="text-lg">Information</span>
              </button>
              <p class="text-sm text-gray-500 mt-2">Updates, new features</p>
            </div>
          </div>

          <!-- Advanced Demos -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <!-- Long Duration -->
            <button
              (click)="showLongDurationNotification()"
              class="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              <i class="fas fa-clock mr-3"></i>
              Long Duration (10s)
            </button>

            <!-- Multiple Notifications -->
            <button
              (click)="showMultipleNotifications()"
              class="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              <i class="fas fa-layer-group mr-3"></i>
              Multiple Stack
            </button>

            <!-- Clear All -->
            <button
              (click)="clearAllNotifications()"
              class="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              <i class="fas fa-trash-alt mr-3"></i>
              Clear All
            </button>
          </div>

          <!-- Comparison Section -->
          <div class="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8 mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">
              🔥 Before vs After
            </h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <!-- Before -->
              <div class="bg-white rounded-xl p-6 shadow-md">
                <h3 class="text-lg font-semibold text-red-600 mb-4 flex items-center">
                  <i class="fas fa-times-circle mr-2"></i>
                  Old Boring Alerts
                </h3>
                <div class="bg-gray-100 border border-gray-300 rounded p-4 mb-4">
                  <div class="flex items-center space-x-2">
                    <i class="fas fa-exclamation-triangle text-yellow-600"></i>
                    <span class="text-sm font-mono">localhost:4200 says</span>
                  </div>
                  <p class="font-mono text-sm mt-2">Login successful!</p>
                  <div class="flex justify-end mt-3 space-x-2">
                    <button class="bg-blue-500 text-white px-3 py-1 text-xs rounded">OK</button>
                  </div>
                </div>
                <ul class="text-sm text-gray-600 space-y-1">
                  <li>❌ Blocks the entire page</li>
                  <li>❌ Looks outdated and unprofessional</li>
                  <li>❌ No customization options</li>
                  <li>❌ Poor user experience</li>
                </ul>
              </div>

              <!-- After -->
              <div class="bg-white rounded-xl p-6 shadow-md">
                <h3 class="text-lg font-semibold text-green-600 mb-4 flex items-center">
                  <i class="fas fa-check-circle mr-2"></i>
                  New Beautiful Notifications
                </h3>
                <div class="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg p-4 mb-4 shadow-sm">
                  <div class="flex items-start space-x-3">
                    <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <i class="fas fa-check text-white text-xs"></i>
                    </div>
                    <div class="flex-1">
                      <h4 class="text-sm font-semibold text-gray-900">Login Successful!</h4>
                      <p class="text-sm text-gray-600">Welcome back! You are now logged in.</p>
                    </div>
                    <button class="text-gray-400 hover:text-gray-600">
                      <i class="fas fa-times text-xs"></i>
                    </button>
                  </div>
                  <div class="h-1 bg-gray-100 mt-3 rounded">
                    <div class="h-full bg-green-500 rounded animate-pulse" style="width: 70%"></div>
                  </div>
                </div>
                <ul class="text-sm text-gray-600 space-y-1">
                  <li>✅ Non-blocking, appears in corner</li>
                  <li>✅ Modern, beautiful design</li>
                  <li>✅ Fully customizable colors</li>
                  <li>✅ Auto-dismiss with progress bar</li>
                  <li>✅ Smooth animations</li>
                  <li>✅ Stack multiple notifications</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Implementation Status -->
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">
              ✨ Implementation Status
            </h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 class="text-lg font-semibold text-green-600 mb-4">✅ Already Implemented</h3>
                <ul class="space-y-2 text-gray-700">
                  <li class="flex items-center">
                    <i class="fas fa-check text-green-500 mr-3"></i>
                    Admin Panel Login/Register
                  </li>
                  <li class="flex items-center">
                    <i class="fas fa-check text-green-500 mr-3"></i>
                    Frontend Login Component
                  </li>
                  <li class="flex items-center">
                    <i class="fas fa-check text-green-500 mr-3"></i>
                    Beautiful notification service
                  </li>
                  <li class="flex items-center">
                    <i class="fas fa-check text-green-500 mr-3"></i>
                    Smooth animations & styling
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 class="text-lg font-semibold text-blue-600 mb-4">🚀 Ready to Expand</h3>
                <ul class="space-y-2 text-gray-700">
                  <li class="flex items-center">
                    <i class="fas fa-arrow-right text-blue-500 mr-3"></i>
                    Replace all remaining alerts
                  </li>
                  <li class="flex items-center">
                    <i class="fas fa-arrow-right text-blue-500 mr-3"></i>
                    Add to form validations
                  </li>
                  <li class="flex items-center">
                    <i class="fas fa-arrow-right text-blue-500 mr-3"></i>
                    API error notifications
                  </li>
                  <li class="flex items-center">
                    <i class="fas fa-arrow-right text-blue-500 mr-3"></i>
                    Success confirmations
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class NotificationDemoComponent {
  constructor(private notificationService: NotificationService) {}

  showSuccessNotification() {
    this.notificationService.showSuccess(
      'Login Successful!',
      'Welcome back! You have been successfully logged in to NexPrepAI.'
    );
  }

  showErrorNotification() {
    this.notificationService.showError(
      'Login Failed',
      'Invalid email or password. Please check your credentials and try again.'
    );
  }

  showWarningNotification() {
    this.notificationService.showWarning(
      'Account Expiry Warning',
      'Your subscription expires in 3 days. Please renew to continue accessing premium features.'
    );
  }

  showInfoNotification() {
    this.notificationService.showInfo(
      'New Feature Available',
      'Check out our new AI-powered practice recommendations in your dashboard!'
    );
  }

  showLongDurationNotification() {
    this.notificationService.showInfo(
      'Extended Duration Demo',
      'This notification will stay visible for 10 seconds to demonstrate custom timing.',
      10000
    );
  }

  showMultipleNotifications() {
    setTimeout(() => {
      this.notificationService.showSuccess('Test Started', 'Your practice test has been initiated successfully.');
    }, 0);

    setTimeout(() => {
      this.notificationService.showInfo('Auto-Save Enabled', 'Your progress is being saved automatically every 30 seconds.');
    }, 800);

    setTimeout(() => {
      this.notificationService.showWarning('Time Warning', 'You have 15 minutes remaining to complete this section.');
    }, 1600);

    setTimeout(() => {
      this.notificationService.showError('Connection Issue', 'Temporary network issue detected. Your progress has been saved locally.');
    }, 2400);
  }

  clearAllNotifications() {
    this.notificationService.clearAll();
  }
}
