import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // For ngModel
import { User, UserService, UserAccountSettingsUpdate } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  currentUserRole: string | null = null;
  isLoading = true;
  errorMessage: string | null = null;
  isSuperAdmin = false; // Added property

  // To store temporary edits for each user
  userEditModels: { [userId: string]: { formAccountExpiresAt: string, formFreeTrialEndsAt: string } } = {};

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.currentUserRole = this.authService.getRole();
    this.isSuperAdmin = this.currentUserRole === 'superadmin'; // Set isSuperAdmin
    if (this.currentUserRole === 'superadmin' || this.currentUserRole === 'admin') {
      this.loadUsers();
    } else {
      this.isLoading = false;
      this.errorMessage = 'You do not have permission to view this page.';
    }
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        // Initialize edit models for each user
        this.users.forEach(user => {
          this.userEditModels[user._id] = {
            formAccountExpiresAt: this.formatDateForInput(user.accountExpiresAt),
            formFreeTrialEndsAt: this.formatDateForInput(user.freeTrialEndsAt)
          };
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching users:', err);
        this.errorMessage = 'Failed to load users. You may not have permission to view this page or the server encountered an error.';
        this.isLoading = false;
      }
    });
  }

  formatDateForInput(dateString?: string | null): string {
    if (dateString) {
      try {
        // Handles full ISO strings and date-only strings
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) {
          return ''; // Invalid date string
        }
        // Format to YYYY-MM-DD for <input type="date">
        const year = date.getFullYear();
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const day = ('0' + date.getDate()).slice(-2);
        return `${year}-${month}-${day}`;
      } catch (e) {
        return ''; // Error parsing date
      }
    }
    return '';
  }
  getDaysLeft(dateString?: string | null): string {
    if (!dateString) {
      return 'N/A';
    }
    const expiryDate = new Date(dateString);
    const today = new Date();
    // Remove time part for accurate day difference calculation
    expiryDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (isNaN(expiryDate.getTime())) {
      return 'Invalid Date';
    }

    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Expired';
    }
    return `${diffDays} days left`;
  }

  getDaysLeftNumber(dateString?: string | null): number {
    if (!dateString) {
      return -1;
    }
    const expiryDate = new Date(dateString);
    const today = new Date();
    // Remove time part for accurate day difference calculation
    expiryDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (isNaN(expiryDate.getTime())) {
      return -1;
    }

    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  addExpiryDays(user: User, days: number): void {
    console.log('[UserManagement] addExpiryDays called.');
    console.log('[UserManagement] Current user role:', this.currentUserRole);
    console.log('[UserManagement] Is SuperAdmin flag:', this.isSuperAdmin);

    if (!this.isSuperAdmin) {
      console.log('[UserManagement] Not a SuperAdmin. Action blocked for addExpiryDays.');
      this.notificationService.showError('Action Blocked', 'Only Superadmins can modify user expiry dates.');
      return;
    }
    console.log('[UserManagement] Is SuperAdmin. Proceeding with addExpiryDays.');
    const today = new Date();
    const newExpiryDate = new Date(today.setDate(today.getDate() + days));
    this.userEditModels[user._id].formAccountExpiresAt = this.formatDateForInput(newExpiryDate.toISOString());
    // Optionally, immediately save or wait for explicit save action
    this.saveUserSettings(user);
  }

  saveUserSettings(user: User): void {
    console.log('[UserManagement] saveUserSettings called.');
    console.log('[UserManagement] Current user role:', this.currentUserRole);
    console.log('[UserManagement] Is SuperAdmin flag:', this.isSuperAdmin);

    if (!this.isSuperAdmin) {
      console.log('[UserManagement] Not a SuperAdmin. Showing alert and returning.');
      this.notificationService.showError('Action Blocked', 'Only Superadmins can modify user settings.');
      return;
    }

    console.log('[UserManagement] Is SuperAdmin. Proceeding with save.');
    if (!this.userEditModels[user._id]) {
      this.notificationService.showError('Save Error', 'Cannot save settings: edit model not found.');
      return;
    }

    const editModel = this.userEditModels[user._id];
    const settings: UserAccountSettingsUpdate = {};

    // Only include if the value is a valid date string, otherwise set to null to clear
    settings.accountExpiresAt = editModel.formAccountExpiresAt ? editModel.formAccountExpiresAt : null;
    settings.freeTrialEndsAt = editModel.formFreeTrialEndsAt ? editModel.formFreeTrialEndsAt : null;
    
    // Basic validation for date formats (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (settings.accountExpiresAt && !dateRegex.test(settings.accountExpiresAt)) {
        this.notificationService.showError('Invalid Date Format', 'Invalid format for Account Expiry Date. Please use YYYY-MM-DD.');
        return;
    }
    if (settings.freeTrialEndsAt && !dateRegex.test(settings.freeTrialEndsAt)) {
        this.notificationService.showError('Invalid Date Format', 'Invalid format for Free Trial End Date. Please use YYYY-MM-DD.');
        return;
    }

    this.userService.updateUserAccountSettings(user._id, settings).subscribe({
      next: () => {
        this.notificationService.showSuccess('Settings Updated', 'User settings updated successfully!');
        // Update the original user object with new dates from the response or edit model
        // For simplicity, we'll just reload all users to reflect changes.
        this.loadUsers();
      },
      error: (err) => {
        console.error('Error updating user settings:', err);
        this.notificationService.showError('Update Failed', `Failed to update settings: ${err.error?.message || 'Server error'}`);
      }
    });
  }
}
