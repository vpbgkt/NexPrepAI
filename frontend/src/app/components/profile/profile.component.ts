import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService, UserProfile, ReferralInfo } from '../../services/user.service'; // Adjust path as needed
import { AuthService, BackendUser } from '../../services/auth.service'; // Import AuthService and BackendUser
import { ReferralModalComponent } from '../referral-modal/referral-modal.component';

@Component({
  selector: 'app-profile',
  standalone: true, 
  imports: [CommonModule, ReactiveFormsModule, ReferralModalComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;  
  currentUser: BackendUser | null = null; // Use BackendUser type
  referralInfo: ReferralInfo | null = null;
  isLoadingReferral = false;
  referralMessage: string | null = null;
  showReferralModal = false;

  // Properties to store and display expiry dates
  accountExpiresAt: string | null = null;
  freeTrialEndsAt: string | null = null;
  isAccountExpired = false;
  isFreeTrialActive = false;
  daysToAccountExpiry: number | null = null;
  daysToFreeTrialExpiry: number | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService // Inject AuthService
  ) {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      displayName: [''],
      photoURL: [''],
      phoneNumber: ['']
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
    this.authService.refreshUserProfile().subscribe({
      next: (profile: BackendUser) => {
        this.currentUser = profile; 
        this.profileForm.patchValue({
          name: profile.name,
          displayName: profile.displayName || '',
          photoURL: profile.photoURL || '',
          phoneNumber: profile.phoneNumber || ''
        });

        this.accountExpiresAt = profile.accountExpiresAt || null;
        this.freeTrialEndsAt = profile.freeTrialEndsAt || null;
        this.updateExpiryStatus();

        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load profile. ' + (err.error?.message || err.message);
        this.isLoading = false;
      }
    });
  }

  updateExpiryStatus(): void {
    const now = new Date();

    if (this.accountExpiresAt) {
      const expiryDate = new Date(this.accountExpiresAt);
      this.isAccountExpired = expiryDate < now;
      this.daysToAccountExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    } else {
      this.isAccountExpired = false; 
      this.daysToAccountExpiry = null;
    }

    if (this.freeTrialEndsAt) {
      const trialEndDate = new Date(this.freeTrialEndsAt);
      this.isFreeTrialActive = trialEndDate >= now;
      this.daysToFreeTrialExpiry = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      if (this.daysToFreeTrialExpiry < 0) this.isFreeTrialActive = false; 
    } else {
      this.isFreeTrialActive = false;
      this.daysToFreeTrialExpiry = null;
    }
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.errorMessage = "Please correct the errors in the form.";
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const profileData: Partial<BackendUser> = { 
      name: this.profileForm.value.name,
      displayName: this.profileForm.value.displayName,
      photoURL: this.profileForm.value.photoURL,
      phoneNumber: this.profileForm.value.phoneNumber
    };

    this.userService.updateMyProfile(profileData as UserProfile).subscribe({ // Cast to UserProfile for the service call if its signature expects that
      next: (updatedProfileResponse) => {
        // Assuming updateMyProfile returns the updated BackendUser or similar structure
        const updatedProfile = updatedProfileResponse as BackendUser;

        this.currentUser = updatedProfile;
        this.profileForm.patchValue({
            name: updatedProfile.name,
            displayName: updatedProfile.displayName || '',
            photoURL: updatedProfile.photoURL || '',
            phoneNumber: updatedProfile.phoneNumber || ''
        });
        this.successMessage = 'Profile updated successfully!';
        this.isLoading = false;

        if (updatedProfile.accountExpiresAt || updatedProfile.freeTrialEndsAt) {
            this.accountExpiresAt = updatedProfile.accountExpiresAt || null;
            this.freeTrialEndsAt = updatedProfile.freeTrialEndsAt || null;
            this.authService.storeUserProfile(updatedProfile); 
            this.updateExpiryStatus();
        }
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

  resetForm(): void {
    if (this.currentUser) {
      this.profileForm.patchValue({
        name: this.currentUser.name,
        displayName: this.currentUser.displayName,
        photoURL: this.currentUser.photoURL,
        phoneNumber: this.currentUser.phoneNumber
      });
      this.profileForm.markAsPristine();
      this.profileForm.markAsUntouched();
      this.errorMessage = null;
      this.successMessage = null;
    }
  }
}
