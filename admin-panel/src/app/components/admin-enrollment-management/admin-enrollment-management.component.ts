import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnrollmentService, EnrollmentResponse, EnrollmentOptions, FilteredBranchesRequest, CompulsoryEnrollmentRequest } from '../../services/enrollment.service';

interface AdminEnrollment {
  _id: string;
  student: {
    _id: string;
    name: string;
    email: string;
  };
  examFamily: {
    _id: string;
    name: string;
    code: string;
  };
  examLevels: Array<{
    _id: string;
    name: string;
    code: string;
  }>;
  branches: Array<{
    _id: string;
    name: string;
  }>;
  enrollmentType: 'self' | 'admin' | 'compulsory';
  accessLevel: string;
  status: string;
  isCompulsory: boolean;
  enrolledAt: string;
}

interface CompulsoryEnrollmentForm {
  examFamily: string;
  examLevels: string[];
  branches: string[];
  compulsoryReason: string;
  targetAudience: 'all' | 'new' | 'specific';
  targetStudents?: string[];
}

@Component({
  selector: 'app-admin-enrollment-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-enrollment-management p-6 bg-white rounded-lg shadow-lg">
      <!-- Header Section -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Enrollment Management</h2>
          <p class="text-gray-600">Manage student enrollments and create compulsory courses</p>
        </div>
        <button 
          (click)="showCreateCompulsory = !showCreateCompulsory"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200">
          {{ showCreateCompulsory ? 'Hide Form' : 'Create Compulsory Enrollment' }}
        </button>
      </div>

      <!-- Create Compulsory Enrollment Form -->
      <div *ngIf="showCreateCompulsory" class="bg-gray-50 p-6 rounded-lg mb-6">
        <h3 class="text-lg font-semibold mb-4">Create Compulsory Enrollment</h3>
        
        <form (ngSubmit)="createCompulsoryEnrollment()" class="space-y-4">
          <!-- Exam Family Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Exam Family</label>
            <select 
              [(ngModel)]="compulsoryForm.examFamily" 
              name="examFamily"
              class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required>
              <option value="">Select Exam Family</option>
              <option *ngFor="let family of enrollmentOptions.examFamilies" [value]="family._id">
                {{ family.name }} ({{ family.code }})
              </option>
            </select>
          </div>

          <!-- Exam Levels Selection -->
          <div *ngIf="compulsoryForm.examFamily">
            <label class="block text-sm font-medium text-gray-700 mb-2">Exam Levels</label>
            <div class="grid grid-cols-2 gap-2">
              <label *ngFor="let level of getExamLevelsForFamily(compulsoryForm.examFamily)" 
                     class="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  [value]="level._id"
                  (change)="onExamLevelChange($event)"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                <span class="text-sm">{{ level.name }}</span>
              </label>
            </div>
          </div>

          <!-- Branches Selection -->
          <div *ngIf="compulsoryForm.examLevels.length > 0">
            <label class="block text-sm font-medium text-gray-700 mb-2">Branches</label>
            <div class="grid grid-cols-2 gap-2">
              <label *ngFor="let branch of availableBranches" class="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  [value]="branch._id"
                  (change)="onBranchChange($event)"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                <span class="text-sm">{{ branch.name }}</span>
              </label>
            </div>
          </div>

          <!-- Compulsory Reason -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Reason for Compulsory Enrollment</label>
            <textarea 
              [(ngModel)]="compulsoryForm.compulsoryReason"
              name="compulsoryReason"
              rows="3"
              class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., All students must take reasoning tests..."
              required></textarea>
          </div>

          <!-- Target Audience -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
            <select 
              [(ngModel)]="compulsoryForm.targetAudience"
              name="targetAudience"
              class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="all">All Students</option>
              <option value="new">New Students Only</option>
              <option value="specific">Specific Students</option>
            </select>
          </div>

          <!-- Submit Button -->
          <div class="flex justify-end space-x-3">
            <button 
              type="button"
              (click)="showCreateCompulsory = false"
              class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition duration-200">
              Cancel
            </button>
            <button 
              type="submit"
              [disabled]="!isCompulsoryFormValid()"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200">
              Create Compulsory Enrollment
            </button>
          </div>
        </form>
      </div>

      <!-- Statistics Section -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-blue-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-blue-800">Total Enrollments</h3>
          <p class="text-2xl font-bold text-blue-600">{{ enrollmentStats.total || 0 }}</p>
        </div>
        <div class="bg-green-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-green-800">Active Enrollments</h3>
          <p class="text-2xl font-bold text-green-600">{{ enrollmentStats.active || 0 }}</p>
        </div>
        <div class="bg-purple-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-purple-800">Compulsory</h3>
          <p class="text-2xl font-bold text-purple-600">{{ enrollmentStats.compulsory || 0 }}</p>
        </div>
        <div class="bg-orange-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-orange-800">Self-Enrolled</h3>
          <p class="text-2xl font-bold text-orange-600">{{ enrollmentStats.self || 0 }}</p>
        </div>
      </div>

      <!-- Enrollments Table -->
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam Family</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Levels</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrolled</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let enrollment of enrollments" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ enrollment.student.name }}</div>
                  <div class="text-sm text-gray-500">{{ enrollment.student.email }}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ enrollment.examFamily.name }}</div>
                <div class="text-sm text-gray-500">{{ enrollment.examFamily.code }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900">
                  <span *ngFor="let level of enrollment.examLevels; let last = last" 
                        class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                    {{ level.name }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span [class]="getEnrollmentTypeClass(enrollment.enrollmentType)" 
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                  {{ enrollment.enrollmentType | titlecase }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span [class]="getStatusClass(enrollment.status)" 
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                  {{ enrollment.status | titlecase }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ enrollment.enrolledAt | date:'short' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button 
                  (click)="viewEnrollmentDetails(enrollment)"
                  class="text-blue-600 hover:text-blue-900 mr-3">
                  View
                </button>
                <button 
                  *ngIf="!enrollment.isCompulsory"
                  (click)="deactivateEnrollment(enrollment._id)"
                  class="text-red-600 hover:text-red-900">
                  Deactivate
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">Loading enrollments...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && enrollments.length === 0" class="text-center py-8">
        <p class="text-gray-500">No enrollments found</p>
      </div>
    </div>
  `,
  styles: [`
    .admin-enrollment-management {
      max-width: 100%;
    }
    
    .table-container {
      max-height: 600px;
      overflow-y: auto;
    }
  `]
})
export class AdminEnrollmentManagementComponent implements OnInit {
  enrollments: AdminEnrollment[] = [];
  enrollmentOptions: EnrollmentOptions = { examFamilies: [], examLevels: {}, examBranches: [] };
  availableBranches: any[] = [];
  enrollmentStats: any = {};
  loading = false;
  showCreateCompulsory = false;

  compulsoryForm: CompulsoryEnrollmentForm = {
    examFamily: '',
    examLevels: [],
    branches: [],
    compulsoryReason: '',
    targetAudience: 'all'
  };

  constructor(private enrollmentService: EnrollmentService) {}

  ngOnInit() {
    this.loadEnrollmentOptions();
    this.loadEnrollments();
    this.loadEnrollmentStats();
  }

  loadEnrollmentOptions() {
    this.enrollmentService.getEnrollmentOptions().subscribe({
      next: (response: EnrollmentResponse) => {
        if (response.success) {
          this.enrollmentOptions = response.data;
        }
      },
      error: (error: any) => {
        console.error('Error loading enrollment options:', error);
      }
    });
  }

  loadEnrollments() {
    this.loading = true;
    // Note: This would need an admin endpoint to get all enrollments
    // For now, we'll use a placeholder
    this.loading = false;
  }

  loadEnrollmentStats() {
    // Note: This would need an admin endpoint for enrollment statistics
    // For now, we'll use placeholder data
    this.enrollmentStats = {
      total: 150,
      active: 140,
      compulsory: 30,
      self: 110
    };
  }

  getExamLevelsForFamily(familyId: string): any[] {
    return this.enrollmentOptions.examLevels[familyId] || [];
  }

  onExamLevelChange(event: any) {
    const levelId = event.target.value;
    if (event.target.checked) {
      if (!this.compulsoryForm.examLevels.includes(levelId)) {
        this.compulsoryForm.examLevels.push(levelId);
      }
    } else {
      this.compulsoryForm.examLevels = this.compulsoryForm.examLevels.filter(id => id !== levelId);
    }
    
    // Update available branches
    this.updateAvailableBranches();
  }

  onBranchChange(event: any) {
    const branchId = event.target.value;
    if (event.target.checked) {
      if (!this.compulsoryForm.branches.includes(branchId)) {
        this.compulsoryForm.branches.push(branchId);
      }
    } else {
      this.compulsoryForm.branches = this.compulsoryForm.branches.filter(id => id !== branchId);
    }
  }

  updateAvailableBranches() {
    if (this.compulsoryForm.examLevels.length > 0) {
      this.enrollmentService.getFilteredBranches({
        examFamily: this.compulsoryForm.examFamily,
        examLevels: this.compulsoryForm.examLevels
      }).subscribe({
        next: (response: EnrollmentResponse) => {
          if (response.success) {
            this.availableBranches = response.data;
          }
        },
        error: (error: any) => {
          console.error('Error loading filtered branches:', error);
        }
      });
    } else {
      this.availableBranches = [];
    }
  }

  isCompulsoryFormValid(): boolean {
    return !!(
      this.compulsoryForm.examFamily &&
      this.compulsoryForm.examLevels.length > 0 &&
      this.compulsoryForm.branches.length > 0 &&
      this.compulsoryForm.compulsoryReason.trim()
    );
  }

  createCompulsoryEnrollment() {
    if (!this.isCompulsoryFormValid()) {
      return;
    }

    // Map form data to service interface
    let targetStudents: 'all' | string[] = 'all';
    if (this.compulsoryForm.targetAudience === 'specific' && this.compulsoryForm.targetStudents) {
      targetStudents = this.compulsoryForm.targetStudents;
    } else if (this.compulsoryForm.targetAudience === 'all') {
      targetStudents = 'all';
    } else if (this.compulsoryForm.targetAudience === 'new') {
      // For 'new' students, we'll send 'all' and let the backend handle filtering
      // Or we could implement a separate endpoint for new students
      targetStudents = 'all';
    }

    const request: CompulsoryEnrollmentRequest = {
      examFamily: this.compulsoryForm.examFamily,
      examLevels: this.compulsoryForm.examLevels,
      branches: this.compulsoryForm.branches,
      compulsoryReason: this.compulsoryForm.compulsoryReason,
      targetStudents: targetStudents
    };

    this.enrollmentService.createCompulsoryEnrollment(request).subscribe({
      next: (response: EnrollmentResponse) => {
        if (response.success) {
          console.log('Compulsory enrollment created successfully:', response.data);
          // Reset form
          this.compulsoryForm = {
            examFamily: '',
            examLevels: [],
            branches: [],
            compulsoryReason: '',
            targetAudience: 'all'
          };
          this.showCreateCompulsory = false;
          this.availableBranches = [];
          // Refresh enrollments list
          this.loadEnrollments();
        }
      },
      error: (error: any) => {
        console.error('Error creating compulsory enrollment:', error);
      }
    });
  }

  getEnrollmentTypeClass(type: string): string {
    switch (type) {
      case 'compulsory':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'self':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  viewEnrollmentDetails(enrollment: AdminEnrollment) {
    // Implement view enrollment details functionality
    console.log('Viewing enrollment details:', enrollment);
  }

  deactivateEnrollment(enrollmentId: string) {
    if (confirm('Are you sure you want to deactivate this enrollment?')) {
      // Note: This would call the admin deactivate enrollment endpoint
      console.log('Deactivating enrollment:', enrollmentId);
    }
  }
}
