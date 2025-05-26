import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService, UserProfile, ReferralInfo } from '../../services/user.service'; // Adjust path as needed
import { ReferralModalComponent } from '../referral-modal/referral-modal.component';

@Component({
  selector: 'app-profile',
  standalone: true, // Assuming standalone component based on ng generate output
  imports: [CommonModule, ReactiveFormsModule, ReferralModalComponent], // Import CommonModule and ReactiveFormsModule
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;  currentUser: UserProfile | null = null;
  referralInfo: ReferralInfo | null = null;
  isLoadingReferral = false;
  referralMessage: string | null = null;
  showReferralModal = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService
  ) {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      displayName: [''],
      photoURL: [''],
      phoneNumber: ['']
      // Add email and username as read-only if you want to display them
      // email: [{ value: '', disabled: true }],
      // username: [{ value: '', disabled: true }]
    });
  }
  ngOnInit(): void {
    this.loadUserProfile();
    this.loadReferralInfo();
  }

  loadUserProfile(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.userService.getMyProfile().subscribe({
      next: (profile) => {
        this.currentUser = profile;
        this.profileForm.patchValue({
          name: profile.name,
          displayName: profile.displayName || '',
          photoURL: profile.photoURL || '',
          phoneNumber: profile.phoneNumber || ''
          // email: profile.email,
          // username: profile.username
        });
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load profile. ' + (err.error?.message || err.message);
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.errorMessage = "Please correct the errors in the form.";
      this.profileForm.markAllAsTouched(); // Mark all fields as touched to show validation errors
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const profileData: UserProfile = {
      // id and email are usually not sent for update, or handled differently
      name: this.profileForm.value.name,
      displayName: this.profileForm.value.displayName,
      photoURL: this.profileForm.value.photoURL,
      phoneNumber: this.profileForm.value.phoneNumber
    };

    this.userService.updateMyProfile(profileData).subscribe({
      next: (updatedProfile) => {
        this.currentUser = updatedProfile;
        this.profileForm.patchValue(updatedProfile); // Update form with potentially sanitized/modified data from backend
        this.successMessage = 'Profile updated successfully!';
        this.isLoading = false;
        // Optionally, clear the success message after a few seconds
        setTimeout(() => {
          this.successMessage = null;
        }, 5000);
      },
      error: (err) => {
        this.errorMessage = 'Failed to update profile. ' + (err.error?.message || err.message);
        this.isLoading = false;
      }
    });
  }

  loadReferralInfo(): void {
    this.isLoadingReferral = true;
    this.referralMessage = null;
    
    this.userService.getReferralInfo().subscribe({
      next: (referralInfo) => {
        this.referralInfo = referralInfo;
        this.isLoadingReferral = false;
      },
      error: (err) => {
        this.referralMessage = 'Failed to load referral information. ' + (err.error?.message || err.message);
        this.isLoadingReferral = false;
      }
    });
  }

  copyToClipboard(text: string, type: string): void {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        this.referralMessage = `${type} copied to clipboard!`;
        this.clearMessageAfterDelay();
      }).catch((err) => {
        console.error('Failed to copy text: ', err);
        this.fallbackCopyTextToClipboard(text, type);
      });
    } else {
      this.fallbackCopyTextToClipboard(text, type);
    }
  }

  private fallbackCopyTextToClipboard(text: string, type: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this.referralMessage = `${type} copied to clipboard!`;
      } else {
        this.referralMessage = `Failed to copy ${type}. Please copy manually.`;
      }
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      this.referralMessage = `Failed to copy ${type}. Please copy manually.`;
    }
    
    document.body.removeChild(textArea);
    this.clearMessageAfterDelay();
  }

  private clearMessageAfterDelay(): void {
    setTimeout(() => {
      this.referralMessage = null;
    }, 3000);
  }

  openReferralModal(): void {
    this.showReferralModal = true;
  }

  closeReferralModal(): void {
    this.showReferralModal = false;
  }

  onReferralSuccess(response: any): void {
    this.referralMessage = response.message || 'Referral code applied successfully!';
    this.loadReferralInfo(); // Reload referral info to show updated data
    this.clearMessageAfterDelay();
  }
}
