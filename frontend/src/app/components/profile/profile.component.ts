import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService, UserProfile } from '../../services/user.service'; // Adjust path as needed

@Component({
  selector: 'app-profile',
  standalone: true, // Assuming standalone component based on ng generate output
  imports: [CommonModule, ReactiveFormsModule], // Import CommonModule and ReactiveFormsModule
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  currentUser: UserProfile | null = null;

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
        // Optionally, reload or re-patch form if backend returns more/different data
        this.loadUserProfile(); 
      },
      error: (err) => {
        this.errorMessage = 'Failed to update profile. ' + (err.error?.message || err.message);
        this.isLoading = false;
      }
    });
  }
}
