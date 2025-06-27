import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { EnrollmentService, Enrollment, EnrollmentOptions, EnrollmentData } from '../../services/enrollment.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-enrollment-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">My Enrollments</h2>
          <p class="text-gray-600">Manage your exam category enrollments to access relevant test series</p>
        </div>
        <button 
          *ngIf="!showEnrollmentForm && enrollmentOptions"
          (click)="toggleEnrollmentForm()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
          <i class="fas fa-plus mr-2"></i>Add New Enrollment
        </button>
      </div>

      <!-- No Enrollments State -->
      <div *ngIf="enrollments.length === 0 && !loading" class="text-center py-12">
        <div class="text-6xl mb-4">📚</div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">No Enrollments Found</h3>
        <p class="text-gray-600 mb-6">You need to enroll in at least one exam category to access test series.</p>
        <button 
          (click)="toggleEnrollmentForm()"
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
          Get Started - Enroll Now
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span class="ml-3 text-gray-600">Loading enrollments...</span>
      </div>

      <!-- Enrollment Form -->
      <div *ngIf="showEnrollmentForm && enrollmentOptions" class="mb-8 bg-gray-50 rounded-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ editingEnrollment ? 'Edit Enrollment' : 'New Enrollment' }}
          </h3>
          <button 
            (click)="cancelEnrollmentForm()"
            class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <form [formGroup]="enrollmentForm" (ngSubmit)="submitEnrollment()" class="space-y-6">
          <!-- Exam Family Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Exam Category <span class="text-red-500">*</span>
            </label>
            <select 
              formControlName="examFamily"
              (change)="onExamFamilyChange()"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              [disabled]="!!editingEnrollment">
              <option value="">Select an exam category</option>
              <option *ngFor="let family of enrollmentOptions.examFamilies" [value]="family._id">
                {{ family.name }}
              </option>
            </select>
            <div *ngIf="enrollmentForm.get('examFamily')?.errors?.['required'] && enrollmentForm.get('examFamily')?.touched" 
                 class="text-red-500 text-sm mt-1">
              Exam category is required
            </div>
          </div>

          <!-- Exam Levels Selection -->
          <div *ngIf="availableExamLevels.length > 0">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Exam Levels <span class="text-red-500">*</span>
            </label>
            <div class="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
              <div *ngFor="let level of availableExamLevels" class="flex items-center">
                <input 
                  type="checkbox"
                  [id]="'level-' + level._id"
                  [value]="level._id"
                  (change)="onExamLevelChange($event, level._id)"
                  [checked]="isExamLevelSelected(level._id)"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                <label [for]="'level-' + level._id" class="ml-2 text-sm text-gray-700">
                  {{ level.name }}
                  <span *ngIf="level.description" class="text-gray-500">- {{ level.description }}</span>
                </label>
              </div>
            </div>
            <div *ngIf="enrollmentForm.get('examLevels')?.errors?.['required'] && enrollmentForm.get('examLevels')?.touched" 
                 class="text-red-500 text-sm mt-1">
              At least one exam level is required
            </div>
          </div>

          <!-- Branches Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Subjects/Branches <span class="text-red-500">*</span>
            </label>
            <div class="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
              <div *ngFor="let branch of availableExamBranches" class="flex items-center">
                <input 
                  type="checkbox"
                  [id]="'branch-' + branch._id"
                  [value]="branch._id"
                  (change)="onBranchChange($event, branch._id)"
                  [checked]="isBranchSelected(branch._id)"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                <label [for]="'branch-' + branch._id" class="ml-2 text-sm text-gray-700">
                  {{ branch.name }}
                  <span *ngIf="branch.description" class="text-gray-500">- {{ branch.description }}</span>
                </label>
              </div>
            </div>
            <div *ngIf="enrollmentForm.get('branches')?.errors?.['required'] && enrollmentForm.get('branches')?.touched" 
                 class="text-red-500 text-sm mt-1">
              At least one branch is required
            </div>
          </div>

          <!-- Preferences -->
          <div class="border-t border-gray-200 pt-6">
            <h4 class="text-md font-medium text-gray-900 mb-4">Preferences</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Difficulty Level -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
                <select 
                  formControlName="difficultyLevel"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  <option value="mixed">Mixed (Recommended)</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <!-- Preferred Language -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Preferred Language</label>
                <select 
                  formControlName="preferredLanguage"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                  <option value="mixed">Both</option>
                </select>
              </div>
            </div>

            <!-- Notifications -->
            <div class="mt-4">
              <label class="flex items-center">
                <input 
                  type="checkbox"
                  formControlName="receiveNotifications"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                <span class="ml-2 text-sm text-gray-700">Receive notifications for new tests and updates</span>
              </label>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button 
              type="button"
              (click)="cancelEnrollmentForm()"
              class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors duration-200">
              Cancel
            </button>
            <button 
              type="submit"
              [disabled]="enrollmentForm.invalid || submitting"
              class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200">
              <span *ngIf="submitting" class="inline-flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ editingEnrollment ? 'Updating...' : 'Creating...' }}
              </span>
              <span *ngIf="!submitting">
                {{ editingEnrollment ? 'Update Enrollment' : 'Create Enrollment' }}
              </span>
            </button>
          </div>
        </form>
      </div>

      <!-- Enrollments List -->
      <div *ngIf="enrollments.length > 0" class="space-y-4">
        <div *ngFor="let enrollment of enrollments" 
             class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
          
          <!-- Enrollment Header -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <div class="flex items-center space-x-3">
                <h3 class="text-lg font-semibold text-gray-900">
                  {{ enrollment.examFamily?.name || 'Unknown Exam Family' }}
                </h3>
                
                <!-- Status Badges -->
                <div class="flex items-center space-x-2">
                  <span [class]="'px-2 py-1 text-xs font-medium rounded-full ' + getAccessLevelBadgeClass(enrollment.accessLevel)">
                    {{ enrollment.accessLevel | titlecase }}
                  </span>
                  
                  <span *ngIf="enrollment.isCompulsory" 
                        class="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                    Compulsory
                  </span>
                  
                  <span [class]="'px-2 py-1 text-xs font-medium rounded-full ' + getStatusBadgeClass(enrollment.status)">
                    {{ enrollment.status | titlecase }}
                  </span>

                  <!-- Error badge for missing exam family -->
                  <span *ngIf="!enrollment.examFamily" 
                        class="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                    Data Error
                  </span>
                </div>
              </div>
              
              <p *ngIf="enrollment.examFamily?.description" class="text-gray-600 mt-1">
                {{ enrollment.examFamily?.description }}
              </p>
              
              <!-- Error message for missing exam family -->
              <p *ngIf="!enrollment.examFamily" class="text-red-600 mt-1 text-sm">
                ⚠️ This enrollment has missing exam family data. Please contact support or delete and recreate this enrollment.
              </p>
            </div>
            
            <!-- Actions -->
            <div class="flex items-center space-x-2">
              <button 
                *ngIf="!enrollment.isCompulsory"
                (click)="editEnrollment(enrollment)"
                class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                title="Edit enrollment">
                <i class="fas fa-edit"></i>
              </button>
              
              <button 
                *ngIf="!enrollment.isCompulsory"
                (click)="deleteEnrollmentConfirm(enrollment)"
                class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                title="Delete enrollment">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>

          <!-- Enrollment Details -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <!-- Exam Levels -->
            <div>
              <h4 class="font-medium text-gray-900 mb-2">Exam Levels</h4>
              <div class="space-y-1">
                <span *ngFor="let level of enrollment.examLevels" 
                      class="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs mr-1 mb-1">
                  {{ level.name }}
                </span>
              </div>
            </div>

            <!-- Branches -->
            <div>
              <h4 class="font-medium text-gray-900 mb-2">Subjects/Branches</h4>
              <div class="space-y-1">
                <span *ngFor="let branch of enrollment.branches" 
                      class="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs mr-1 mb-1">
                  {{ branch.name }}
                </span>
              </div>
            </div>

            <!-- Preferences -->
            <div>
              <h4 class="font-medium text-gray-900 mb-2">Preferences</h4>
              <div class="space-y-1 text-gray-600">
                <div>Difficulty: {{ enrollment.preferences.difficultyLevel | titlecase }}</div>
                <div>Language: {{ enrollment.preferences.preferredLanguage | titlecase }}</div>
                <div>Notifications: {{ enrollment.preferences.receiveNotifications ? 'Enabled' : 'Disabled' }}</div>
              </div>
            </div>
          </div>

          <!-- Enrollment Info -->
          <div class="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
            <div class="flex items-center justify-between">
              <span>Enrolled on: {{ enrollment.enrolledAt | date:'mediumDate' }}</span>
              <span>Status: {{ enrollment.status | titlecase }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Success/Error Messages -->
    <div *ngIf="message" 
         [class]="'fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ' + (messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')">
      {{ message }}
    </div>

    <!-- Delete Confirmation Modal -->
    <div *ngIf="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg max-w-md w-full mx-4 p-6">
        <div class="flex items-center mb-4">
          <div class="flex-shrink-0">
            <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z">
              </path>
            </svg>
          </div>
          <div class="ml-4">
            <h3 class="text-lg font-medium text-gray-900">Delete Enrollment</h3>
          </div>
        </div>
        
        <div class="mb-6">
          <p class="text-gray-600" *ngIf="enrollmentToDelete">
            Are you sure you want to delete your enrollment for 
            <strong>"{{ enrollmentToDelete.examFamily?.name || 'Unknown Exam Family' }}"</strong>?
          </p>
          
          <div *ngIf="enrollmentToDelete" class="mt-4 p-3 bg-gray-50 rounded">
            <p class="text-sm text-gray-700 mb-2"><strong>This will remove your access to:</strong></p>
            <ul class="text-sm text-gray-600 space-y-1">
              <li>• <strong>Levels:</strong> {{ getExamLevelNames(enrollmentToDelete) }}</li>
              <li>• <strong>Branches:</strong> {{ getBranchNames(enrollmentToDelete) }}</li>
            </ul>
          </div>
          
          <p class="text-red-600 text-sm mt-3">
            <strong>This action cannot be undone.</strong>
          </p>
        </div>
        
        <div class="flex items-center justify-end space-x-4">
          <button 
            type="button"
            (click)="cancelDelete()"
            class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors duration-200">
            Cancel
          </button>
          <button 
            type="button"
            (click)="confirmDelete()"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200">
            Delete Enrollment
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-spin {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class EnrollmentManagementComponent implements OnInit, OnDestroy {
  enrollments: Enrollment[] = [];
  enrollmentOptions: EnrollmentOptions | null = null;
  loading = false;
  showEnrollmentForm = false;
  editingEnrollment: Enrollment | null = null;
  submitting = false;
  message = '';
  messageType: 'success' | 'error' = 'success';
  
  // Delete confirmation modal
  showDeleteModal = false;
  enrollmentToDelete: Enrollment | null = null;

  enrollmentForm: FormGroup;
  availableExamLevels: any[] = [];
  availableExamBranches: any[] = []; // Use examBranches instead of branches

  private subscriptions: Subscription[] = [];

  constructor(
    private enrollmentService: EnrollmentService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.enrollmentForm = this.createEnrollmentForm();
  }

  ngOnInit(): void {
    console.log('🚀 EnrollmentManagementComponent: Initializing...');
    this.loadInitialData();
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupSubscriptions(): void {
    // Subscribe to enrollments
    this.subscriptions.push(
      this.enrollmentService.enrollments$.subscribe(enrollments => {
        console.log('📦 EnrollmentComponent: Enrollments updated:', enrollments);
        this.enrollments = enrollments;
      })
    );

    // Subscribe to enrollment options
    this.subscriptions.push(
      this.enrollmentService.enrollmentOptions$.subscribe(options => {
        console.log('📦 EnrollmentComponent: Enrollment options updated:', options);
        this.enrollmentOptions = options;
      })
    );
  }

  private loadInitialData(): void {
    this.loading = true;
    console.log('🔄 Loading enrollment data...');
    
    // Load enrollment options first
    this.enrollmentService.getEnrollmentOptions().subscribe({
      next: (response) => {
        console.log('✅ Enrollment options loaded:', response);
        // Then load user enrollments
        this.enrollmentService.getMyEnrollments().subscribe({
          next: (enrollmentResponse) => {
            console.log('✅ Enrollments loaded:', enrollmentResponse);
            this.loading = false;
          },
          error: (error) => {
            console.error('❌ Error loading enrollments:', error);
            this.loading = false;
            this.showMessage(`Failed to load enrollments: ${error.error?.message || error.message}`, 'error');
          }
        });
      },
      error: (error) => {
        console.error('❌ Error loading enrollment options:', error);
        this.loading = false;
        this.showMessage(`Failed to load enrollment options: ${error.error?.message || error.message}`, 'error');
      }
    });
  }

  private createEnrollmentForm(): FormGroup {
    return this.fb.group({
      examFamily: ['', Validators.required],
      examLevels: [[], Validators.required],
      branches: [[], Validators.required],
      accessLevel: ['basic'],
      receiveNotifications: [true],
      difficultyLevel: ['mixed'],
      preferredLanguage: ['english']
    });
  }

  toggleEnrollmentForm(): void {
    this.showEnrollmentForm = !this.showEnrollmentForm;
    if (this.showEnrollmentForm) {
      this.resetForm();
    }
  }

  cancelEnrollmentForm(): void {
    this.showEnrollmentForm = false;
    this.editingEnrollment = null;
    this.resetForm();
  }

  private resetForm(): void {
    this.enrollmentForm.reset({
      examFamily: '',
      examLevels: [],
      branches: [],
      accessLevel: 'basic',
      receiveNotifications: true,
      difficultyLevel: 'mixed',
      preferredLanguage: 'english'
    });
    this.availableExamLevels = [];
    this.availableExamBranches = [];
  }

  onExamFamilyChange(): void {
    const familyId = this.enrollmentForm.get('examFamily')?.value;
    if (familyId && this.enrollmentOptions) {
      this.availableExamLevels = this.enrollmentOptions.examLevels[familyId] || [];
      // Reset exam levels and branches when family changes
      this.enrollmentForm.patchValue({ 
        examLevels: [],
        branches: []
      });
      this.loadFilteredBranches();
    } else {
      this.availableExamLevels = [];
      this.availableExamBranches = [];
    }
  }

  onExamLevelChange(event: any, levelId: string): void {
    const currentLevels = this.enrollmentForm.get('examLevels')?.value || [];
    if (event.target.checked) {
      this.enrollmentForm.patchValue({
        examLevels: [...currentLevels, levelId]
      });
    } else {
      this.enrollmentForm.patchValue({
        examLevels: currentLevels.filter((id: string) => id !== levelId)
      });
    }
    
    // Reset branches and reload filtered ones
    this.enrollmentForm.patchValue({ branches: [] });
    this.loadFilteredBranches();
  }

  onBranchChange(event: any, branchId: string): void {
    const currentBranches = this.enrollmentForm.get('branches')?.value || [];
    if (event.target.checked) {
      this.enrollmentForm.patchValue({
        branches: [...currentBranches, branchId]
      });
    } else {
      this.enrollmentForm.patchValue({
        branches: currentBranches.filter((id: string) => id !== branchId)
      });
    }
  }

  isExamLevelSelected(levelId: string): boolean {
    const selectedLevels = this.enrollmentForm.get('examLevels')?.value || [];
    return selectedLevels.includes(levelId);
  }

  isBranchSelected(branchId: string): boolean {
    const selectedBranches = this.enrollmentForm.get('branches')?.value || [];
    return selectedBranches.includes(branchId);
  }

  submitEnrollment(): void {
    if (this.enrollmentForm.invalid) {
      this.enrollmentForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const formValue = this.enrollmentForm.value;
    
    const enrollmentData: EnrollmentData = {
      examFamily: formValue.examFamily,
      examLevels: formValue.examLevels,
      branches: formValue.branches,
      accessLevel: formValue.accessLevel,
      preferences: {
        receiveNotifications: formValue.receiveNotifications,
        difficultyLevel: formValue.difficultyLevel,
        preferredLanguage: formValue.preferredLanguage
      }
    };

    const operation = this.editingEnrollment
      ? this.enrollmentService.updateEnrollment(this.editingEnrollment._id, enrollmentData)
      : this.enrollmentService.createEnrollment(enrollmentData);

    operation.subscribe({
      next: (response) => {
        console.log('✅ Enrollment operation successful:', response);
        this.submitting = false;
        this.showMessage(
          this.editingEnrollment ? 'Enrollment updated successfully!' : 'Enrollment created successfully!',
          'success'
        );
        this.cancelEnrollmentForm();
        // Refresh the enrollments list
        this.loadInitialData();
      },
      error: (error) => {
        console.error('❌ Enrollment operation failed:', error);
        this.submitting = false;
        this.showMessage(
          error.error?.message || error.message || 'Failed to save enrollment',
          'error'
        );
      }
    });
  }

  editEnrollment(enrollment: Enrollment): void {
    // Check if enrollment has valid examFamily data
    if (!enrollment.examFamily) {
      this.showMessage('Cannot edit enrollment with missing exam family data. Please delete and recreate this enrollment.', 'error');
      return;
    }

    this.editingEnrollment = enrollment;
    this.showEnrollmentForm = true;
    
    // Set available exam levels for the selected family
    if (this.enrollmentOptions) {
      this.availableExamLevels = this.enrollmentOptions.examLevels[enrollment.examFamily._id] || [];
    }
    
    // Populate form with enrollment data
    this.enrollmentForm.patchValue({
      examFamily: enrollment.examFamily._id,
      examLevels: enrollment.examLevels.map(level => level._id),
      branches: enrollment.branches.map(branch => branch._id),
      accessLevel: enrollment.accessLevel,
      receiveNotifications: enrollment.preferences.receiveNotifications,
      difficultyLevel: enrollment.preferences.difficultyLevel,
      preferredLanguage: enrollment.preferences.preferredLanguage
    });
    
    // Load filtered branches for the selected family and levels
    this.loadFilteredBranches();
  }

  deleteEnrollmentConfirm(enrollment: Enrollment): void {
    this.enrollmentToDelete = enrollment;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.enrollmentToDelete) return;

    console.log('🗑️ Deleting enrollment:', this.enrollmentToDelete._id);
    this.enrollmentService.deleteEnrollment(this.enrollmentToDelete._id).subscribe({
      next: (response) => {
        console.log('✅ Enrollment deleted successfully:', response);
        this.showMessage('Enrollment deleted successfully', 'success');
        this.cancelDelete();
        // Refresh the enrollments list
        this.loadInitialData();
      },
      error: (error) => {
        console.error('❌ Error deleting enrollment:', error);
        this.showMessage(
          error.error?.message || error.message || 'Failed to delete enrollment',
          'error'
        );
        this.cancelDelete();
      }
    });
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.enrollmentToDelete = null;
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getAccessLevelBadgeClass(accessLevel: string): string {
    switch (accessLevel) {
      case 'basic':
        return 'bg-gray-100 text-gray-800';
      case 'premium':
        return 'bg-yellow-100 text-yellow-800';
      case 'full':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
    
    // Clear message after 5 seconds
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  private loadFilteredBranches(): void {
    const familyId = this.enrollmentForm.get('examFamily')?.value;
    const levelIds = this.enrollmentForm.get('examLevels')?.value || [];
    
    if (!familyId) {
      this.availableExamBranches = [];
      return;
    }

    this.enrollmentService.getFilteredExamBranches(familyId, levelIds).subscribe({
      next: (response) => {
        if (response.success) {
          this.availableExamBranches = response.data;
        } else {
          this.availableExamBranches = [];
        }
      },
      error: (error) => {
        console.error('Error loading filtered exam branches:', error);
        this.availableExamBranches = [];
        // Fallback to all exam branches if filtering fails
        if (this.enrollmentOptions) {
          this.availableExamBranches = this.enrollmentOptions.examBranches || [];
        }
      }
    });
  }

  // Helper methods for template
  getExamLevelNames(enrollment: Enrollment): string {
    return enrollment.examLevels.map(l => l.name).join(', ');
  }

  getBranchNames(enrollment: Enrollment): string {
    return enrollment.branches.map(b => b.name).join(', ');
  }
}
